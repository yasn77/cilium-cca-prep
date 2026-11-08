/**
 * TypeSafe SystemOne client — the decision model used as the quality judge.
 *
 * Shape taken from the reference client (AboveColin/jevclient):
 *
 *   POST {base}/v1/systemone
 *   { "state": <string|object|array>,
 *     "model": "jev-latest",
 *     "questions": { "<key>": { "type": "choice",
 *                               "instructions": <string|object>,
 *                               "criteria": { "<option>": "<rubric>" } } } }
 *
 *   -> { "model": ..., "answers": { "<key>": { "type": "choice",
 *                                              "choice": "...",
 *                                              "probabilities": {...},
 *                                              "confidence": 0.87 } } }
 *
 * Questions batch close to free in time (100 questions measured at ~714 ms
 * against ~712 ms for 3), so the whole candidate set goes in a handful of calls.
 */
import { providers } from './config.mjs';

/** nano-gpt namespaces the SystemOne model; the direct API does not. */
const JUDGE_MODEL_FOR = {
  'https://nano-gpt.com/api/v1': '~typesafe/jev-latest',
  'https://api.typesafe.ai': 'jev-latest',
};

export function judgeConfig() {
  const p = providers.judge;
  const apiKey = process.env[p.keyEnv] || process.env[p.fallbackKeyEnv];
  const baseUrl = process.env[p.baseUrlEnv] || p.defaultBaseUrl;
  return {
    baseUrl,
    model: (p.modelEnv && process.env[p.modelEnv]) || JUDGE_MODEL_FOR[baseUrl] || p.model,
    apiKey,
    batchSize: p.batchSize,
    configured: Boolean(apiKey),
    keySource: process.env[p.keyEnv] ? p.keyEnv : process.env[p.fallbackKeyEnv] ? p.fallbackKeyEnv : null,
  };
}

export const DEFECT_CATEGORIES = {
  good_exam_item: 'A fair, unambiguous single-answer question that a Cilium practitioner preparing for an associate-level exam should be able to answer.',
  answer_not_determinable: 'The correct answer cannot be determined from the question as written, or more than one option could be defended.',
  distractors_too_obvious: 'The wrong options are implausible or so obviously wrong that the answer can be guessed without knowing Cilium.',
  ambiguity_two_correct: 'Two options are both defensibly correct.',
  trivia_not_in_blueprint: 'The question tests a detail outside an entry-level Cilium associate curriculum, or a trivial formatting detail.',
  wording_broken: 'The question text is ungrammatical, incomplete, or refers to missing context such as an absent diagram or command output.',
};

function buildPayload(items, model, state) {
  const questions = {};
  for (const item of items) {
    questions[item.key] = {
      type: 'choice',
      instructions: {
        question: item.stem,
        options: item.options.map((o) => ({ id: o.id, text: o.text })),
        marked_answer: item.answer,
        explanation: item.explanation,
        source_excerpt: item.quote,
        ask: 'Judge whether this is a good exam item for a Cilium Certified Associate exam, and if not, which defect is the dominant one.',
      },
      criteria: DEFECT_CATEGORIES,
    };
  }
  return { state, model, questions };
}

async function post(cfg, payload, attempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/v1/systemone`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      if (!res.ok) {
        lastErr = new Error(`systemone HTTP ${res.status}: ${text.slice(0, 300)}`);
        if ((res.status === 429 || res.status >= 500) && attempt < attempts) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw lastErr;
      }
      return JSON.parse(text);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr ?? new Error('systemone failed');
}

/**
 * Judge a list of items. Returns a map key -> { choice, probabilities, confidence }.
 * Items must carry: key, stem, options[{id,text}], answer, explanation, quote.
 */
export async function judge(items, cfg = judgeConfig()) {
  if (!cfg.configured) throw new Error('judge provider has no API key');

  const state =
    'You are evaluating candidate questions that were generated from the official Cilium documentation for a study app. ' +
    'The app prepares engineers for the Cilium Certified Associate exam, an entry-level multiple-choice certification. ' +
    'Each question below was written from the source excerpt shown in its instructions.';

  const out = new Map();
  for (let i = 0; i < items.length; i += cfg.batchSize) {
    const batch = items.slice(i, i + cfg.batchSize);
    const payload = buildPayload(batch, cfg.model, state);
    const data = await post(cfg, payload);
    const answers = data.answers ?? {};
    for (const item of batch) {
      const a = answers[item.key];
      if (!a) {
        out.set(item.key, { choice: 'error', probabilities: {}, confidence: 0, error: 'no answer returned' });
        continue;
      }
      out.set(item.key, {
        choice: a.choice,
        probabilities: a.probabilities ?? {},
        confidence: a.confidence ?? 0,
      });
    }
  }
  return out;
}
