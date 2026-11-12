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

/** nano-gpt namespaces the SystemOne model; OpenRouter and TypeSafe take it bare. */
const JUDGE_MODEL_FOR = {
  'https://nano-gpt.com/api/v1': '~typesafe/jev-latest',
  'https://openrouter.ai/api/v1': 'jev-latest',
  'https://api.typesafe.ai': 'jev-latest',
};

export function judgeConfig() {
  const p = providers.judge;
  const baseUrl = process.env[p.baseUrlEnv] || p.defaultBaseUrl;
  const keyCandidates = [p.keyEnv, ...(p.fallbackKeyEnvs ?? []), p.fallbackKeyEnv].filter(Boolean);
  const keySource = keyCandidates.find((name) => process.env[name]);
  return {
    baseUrl,
    model: (p.modelEnv && process.env[p.modelEnv]) || JUDGE_MODEL_FOR[baseUrl] || p.model,
    apiKey: keySource ? process.env[keySource] : undefined,
    batchSize: p.batchSize,
    configured: Boolean(keySource),
    keySource: keySource ?? null,
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

/**
 * The SystemOne path, joined against a base that may or may not include /v1.
 *
 * Gateways differ: TypeSafe is `https://api.typesafe.ai` and needs `/v1/systemone`,
 * while OpenRouter is `https://openrouter.ai/api/v1` and would become
 * `/api/v1/v1/systemone` if the version were appended blindly.
 */
function systemoneUrl(baseUrl) {
  const base = baseUrl.replace(/\/+$/, '');
  return base.endsWith('/v1') ? `${base}/systemone` : `${base}/v1/systemone`;
}

async function post(cfg, payload, attempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(systemoneUrl(cfg.baseUrl), {
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
/**
 * Difficulty rubric, as an ordered `score` question.
 *
 * Five levels because SystemOne's score primitive allows up to ten and a
 * five-point scale maps cleanly onto the slider the app exposes. The middle
 * level is the real exam, which is what the slider defaults to.
 */
export const DIFFICULTY_LEVELS = [
  'Foundational recall: a basic definition, the high-level role of a component, or a primary use case.',
  'Easy associate: a standard concept or a common CLI command taken from the getting-started guides.',
  'CCA exam target: a practical scenario, reading a standard policy or manifest, or comparing two core features.',
  'Hard / advanced: a specific configuration parameter, an interaction between features, or detailed troubleshooting.',
  'Expert / deep dive: low-level datapath internals, obscure edge-case caveats, or kernel and scale tuning.',
];

function buildDifficultyPayload(items, model, state) {
  const questions = {};
  for (const item of items) {
    questions[item.key] = {
      type: 'score',
      instructions: {
        question: item.stem,
        options: item.options.map((o) => `${o.id}) ${o.text}`),
        marked_answer: item.answer,
        source_file: item.file ?? null,
        has_attachment: Boolean(item.hasAttachment),
        ask: 'Rate how difficult this question is for a candidate sitting the Cilium Certified Associate exam. The middle level is the real exam.',
      },
      criteria: DIFFICULTY_LEVELS,
    };
  }
  return { state, model, questions };
}

/**
 * Score difficulty for each item.
 *
 * Returns a map key -> { difficulty (1.00-5.00), distribution, confidence }.
 * SystemOne answers with a score on the 0-4 index scale plus the probability of
 * each level, so the continuous value is `score + 1`.
 */
export async function scoreDifficulty(items, cfg = judgeConfig()) {
  if (!cfg.configured) throw new Error('judge provider has no API key');

  const state =
    'You are calibrating question difficulty for a study app preparing engineers for the Cilium Certified Associate exam, ' +
    'an entry-level multiple-choice certification. The exam tests conceptual understanding, standard CLI usage and reading ' +
    'common manifests; it is not an expert or internals exam.';

  const out = new Map();
  for (let i = 0; i < items.length; i += cfg.batchSize) {
    const batch = items.slice(i, i + cfg.batchSize);
    const data = await post(cfg, buildDifficultyPayload(batch, cfg.model, state));
    const answers = data.answers ?? {};
    for (const item of batch) {
      const a = answers[item.key];
      if (!a || typeof a.score !== 'number') {
        out.set(item.key, { difficulty: null, distribution: a?.probabilities ?? {}, confidence: a?.confidence ?? 0 });
        continue;
      }
      out.set(item.key, {
        difficulty: Number((a.score + 1).toFixed(2)),
        distribution: a.probabilities ?? {},
        confidence: a.confidence ?? 0,
      });
    }
  }
  return out;
}

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
