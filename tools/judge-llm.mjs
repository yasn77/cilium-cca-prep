#!/usr/bin/env node
/**
 * Adversarial re-answer judge.
 *
 * A second model, given only the cited passage and the options, answers the
 * question blind. Its answer is compared with the marked one.
 *
 * Why this is the right shape of check: the failure modes that matter are not
 * "the model could not write English" but "the marked answer is not derivable
 * from the passage" and "two options are both defensible". Both of those show
 * up immediately when a fresh reader picks differently. Asking a model to rate
 * its own question's fairness invites it to agree with itself; asking it to
 * answer the question cold does not.
 *
 * The judging model is deliberately a different family from the generator, so
 * the two do not share blind spots.
 *
 * Writes candidates/verdicts-llm.json in the same shape as verdicts.json, so
 * verify.mjs treats either source identically.
 *
 *   node tools/judge-llm.mjs                 # all unjudged candidates
 *   node tools/judge-llm.mjs --limit=50
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, readJson, readJsonl, writeJson, log, quotePresent } from './lib.mjs';
import { chat, extractJson } from './llm.mjs';

const args = new Set(process.argv.slice(2));
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) ?? '').split('=')[1]) || 0;
/** Re-answer every candidate rather than only those without a verdict. */
const REJUDGE = args.has('--rejudge');
const CONCURRENCY = Number(process.env.JUDGE_CONCURRENCY ?? 8);

const OUT = path.join(ROOT, 'candidates', 'verdicts-llm.json');
const TEMPLATES = path.join(ROOT, 'candidates', 'templates.jsonl');
const AI = path.join(ROOT, 'candidates', 'ai.jsonl');
const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');
const CORPUS = path.join(ROOT, 'data', 'corpus.json');

/**
 * The judge model.
 *
 * Pinned, and a different family from the generator (deepseek). Accuracy is
 * worth more than price here: a judge that misses a broken question lets it
 * into the corpus, which is the one thing this gate exists to prevent.
 */
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? 'openai/gpt-5-nano';
const JUDGE_BASE_URL = process.env.JUDGE_BASE_URL ?? 'https://openrouter.ai/api/v1';

const SYSTEM = `You are sitting a Cilium Certified Associate exam.

You will be given a passage from the Cilium documentation and one multiple-choice question written from it.

Answer the question using only the passage. Do not use outside knowledge and do not try to guess what the question author intended beyond what the passage supports.

If the passage does not settle the question, say so rather than picking the least-wrong option.

Return JSON only:
{"answer":"a","confidence":0.0,"alternatives_defensible":[],"note":"one short sentence"}

- "answer": the option id you believe is correct, or "none" if the passage does not settle it
- "confidence": 0 to 1
- "alternatives_defensible": any option ids that another careful reader could defend from this passage alone
- "note": why, in one sentence`;

function buildPrompt(questions, sectionText) {
  const blocks = questions.map((q) => ({
    key: q.id,
    stem: q.stem,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));
  return `PASSAGE:
"""
${sectionText.slice(0, 6000)}
"""

QUESTIONS:
${JSON.stringify(blocks, null, 2)}

Answer every question. Return {"answers": {"<key>": {"answer":"a","confidence":0.8,"alternatives_defensible":[],"note":"..."}}}`;
}

function judgeConfig() {
  const apiKey = process.env.JUDGE_API_KEY ?? process.env.OPENROUTER_API_KEY;
  return {
    baseUrl: JUDGE_BASE_URL,
    model: JUDGE_MODEL,
    apiKey,
    temperature: 0,
    maxTokens: 2000,
    // The judging model requires reasoning and rejects attempts to disable it;
    // the client falls back automatically, this just avoids the first 400.
    disableReasoning: false,
    configured: Boolean(apiKey),
  };
}

/** Grade one answer against the marked one. */
function grade(q, verdict) {
  // No verdict object at all means the batch did not parse. That is an
  // infrastructure failure, not a judgement, and must not be recorded as a
  // quality defect: conflating the two quarantines good questions whenever the
  // model truncates.
  if (!verdict || typeof verdict !== 'object') {
    return { choice: 'error', confidence: 0, detail: 'no verdict returned for this key' };
  }

  const marked = q.answer;
  const said = verdict.answer;
  const confidence = Number(verdict.confidence ?? 0);
  const alternatives = Array.isArray(verdict.alternatives_defensible) ? verdict.alternatives_defensible : [];

  if (!said) return { choice: 'error', confidence, detail: 'verdict had no answer field' };

  // The judge could not settle it from the passage: either the citation does
  // not contain the answer, or the question needs context it does not have.
  if (said === 'none') return { choice: 'answer_not_determinable', confidence, detail: verdict.note ?? null };

  if (said !== marked) {
    // Two defensible options is a different defect from a wrong key, and worth
    // distinguishing because it points at the distractor set rather than the
    // citation.
    if (alternatives.includes(marked)) {
      return { choice: 'ambiguity_two_correct', confidence, detail: `${said} vs marked ${marked}` };
    }
    return { choice: 'answer_not_determinable', confidence, detail: `judge said ${said}, marked ${marked}` };
  }

  // Agreed, but unsure, means a careful reader could still go the other way.
  if (confidence < 0.6) return { choice: 'ambiguity_two_correct', confidence, detail: 'agreed but low confidence' };

  return { choice: 'good_exam_item', confidence, detail: null };
}

/** One batch, retried once, returning null when the response cannot be read. */
async function askBatch(cfg, batch, sectionText) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { text } = await chat(
        [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt(batch, sectionText) },
        ],
        { cfg: { ...cfg, maxTokens: attempt === 0 ? cfg.maxTokens : cfg.maxTokens * 2 } },
      );
      const parsed = extractJson(text);
      if (parsed?.answers && Object.keys(parsed.answers).length) return parsed;
    } catch {
      /* fall through to the retry, then to null */
    }
  }
  return null;
}

async function main() {
  const cfg = judgeConfig();
  if (!cfg.configured) {
    // Keep whatever was judged before rather than erasing it.
    log('judge-llm', 'no JUDGE_API_KEY or OPENROUTER_API_KEY: skipping, verdicts left as they were');
    return;
  }

  const sections = (JSON.parse(await readFile(SECTIONS, 'utf8')).sections ?? []);
  const byKey = new Map(sections.map((s) => [`${s.file}#${s.renderedAnchor ?? s.anchor}`, s]));

  // Judge every candidate, not just what currently ships.
  //
  // Reading the shipped corpus here created a deadlock: the corpus is decided
  // by the merge of both judges, but the second judge only looked at questions
  // that had already survived the first one's verdict, so a newly generated
  // candidate could never acquire an adversarial verdict and could never be
  // admitted. The judging target is the candidate set.
  let targets = [...(await readJsonl(TEMPLATES)), ...(await readJsonl(AI))];
  if (!targets.length) {
    const corpus = await readJson(CORPUS, { questions: [] });
    targets = corpus.questions ?? [];
  }
  if (LIMIT) targets = targets.slice(0, LIMIT);

  // Reuse verdicts for candidates already answered, so a refresh only pays for
  // new questions and the committed verdict file stops churning.
  const previous = (await readJson(OUT, {}))?.verdicts ?? {};
  const targetIds = new Set(targets.map((q) => q.id));
  const kept = Object.fromEntries(Object.entries(previous).filter(([id]) => targetIds.has(id)));
  if (!REJUDGE) targets = targets.filter((q) => !kept[q.id]);

  log('judge-llm', `${targets.length} questions to judge via ${cfg.model} at ${cfg.baseUrl} (${Object.keys(kept).length} already judged)`);
  if (!targets.length) {
    log('judge-llm', 'nothing new to judge; kept existing verdicts');
    return;
  }

  // Group by cited section so one passage serves several questions. This cuts
  // input tokens by roughly the number of questions per section.
  const groups = new Map();
  for (const q of targets) {
    const c = q.citations?.[0];
    if (!c) continue;
    const key = `${c.file}#${c.anchor}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }

  const verdicts = { ...kept };
  const histogram = {};
  let done = 0;
  const work = [...groups.entries()];

  let cursor = 0;
  async function worker() {
    while (cursor < work.length) {
      const [key, questionsForSection] = work[cursor];
      cursor += 1;
      const section = byKey.get(key);
      if (!section) {
        for (const q of questionsForSection) verdicts[q.id] = { choice: 'error', detail: 'section missing' };
        continue;
      }

      // Batches of four keep the response short enough to survive truncation.
      for (let i = 0; i < questionsForSection.length; i += 4) {
        const batch = questionsForSection.slice(i, i + 4);
        const parsed = await askBatch(cfg, batch, section.text);
        const answers = parsed?.answers ?? {};
        for (const q of batch) {
          const v = grade(q, answers[q.id]);
          verdicts[q.id] = v;
          histogram[v.choice] = (histogram[v.choice] ?? 0) + 1;
          done += 1;
        }
      }
      if (done % 50 < 6) log('judge-llm', `${done}/${targets.length}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Histogram over the whole kept set, not just this run's slice, so the number
  // in the report describes the corpus rather than the increment.
  const merged = {};
  for (const v of Object.values(verdicts)) merged[v?.choice ?? 'unknown'] = (merged[v?.choice ?? 'unknown'] ?? 0) + 1;

  await writeJson(OUT, {
    generatedAt: new Date().toISOString(),
    model: cfg.model,
    baseUrl: cfg.baseUrl,
    configured: true,
    method: 'adversarial re-answer',
    histogram: merged,
    verdicts: Object.fromEntries(Object.entries(verdicts).sort(([a], [b]) => a.localeCompare(b))),
  });

  log('judge-llm', `histogram: ${JSON.stringify(merged)}`);
  log('judge-llm', `${merged.good_exam_item ?? 0}/${Object.keys(verdicts).length} agreed at confidence`);
  void quotePresent;
}

await main();
