#!/usr/bin/env node
/**
 * Run the quality judge over every candidate.
 *
 * The judge (TypeSafe SystemOne) answers a `choice` question per candidate,
 * picking one of six defect categories. It is a quality gate, not a truth gate:
 * it cannot verify a fact and it returns no reasoning, so a `good_exam_item`
 * verdict never overrides a failed citation check in verify.mjs.
 *
 * Missing credential is not a failure: the file is written empty, the pipeline
 * carries on, and verify.mjs records `judge: not-configured` on every question
 * so the corpus is visibly un-judged rather than silently blessed.
 */
import { readJson, readJsonl, writeJson, log } from './lib.mjs';
import { judge, scoreDifficulty, judgeConfig, DEFECT_CATEGORIES } from './systemone.mjs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const TEMPLATES = path.join(ROOT, 'candidates', 'templates.jsonl');
const AI = path.join(ROOT, 'candidates', 'ai.jsonl');
const OUT = path.join(ROOT, 'candidates', 'verdicts.json');

const args = new Set(process.argv.slice(2));
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) ?? '').split('=')[1]) || 0;
/**
 * Re-judge everything, rather than only candidates that have no verdict.
 *
 * Judging is the slowest and least stable part of the run: a fresh pass moves a
 * few questions between shipped and quarantined for no reason, and rewrites
 * every verdict in the diff. Reusing an existing verdict keeps the corpus stable
 * and makes the pull request readable. Use this when the judge model changes.
 */
const REJUDGE = args.has('--rejudge');

/** Count verdicts by category, over a stable key order. */
function histogramOf(verdicts) {
  const histogram = {};
  for (const v of Object.values(verdicts)) {
    const k = v?.choice ?? 'unknown';
    histogram[k] = (histogram[k] ?? 0) + 1;
  }
  return histogram;
}

/** Sort keys so an unchanged set serialises identically and the diff stays small. */
function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const cfg = judgeConfig();
  const templates = await readJsonl(TEMPLATES);
  const ai = await readJsonl(AI);
  const all = [...templates, ...ai].slice(0, LIMIT || undefined);

  if (!all.length) {
    log('judge', 'no candidates to judge');
    await writeJson(OUT, { generatedAt: new Date().toISOString(), model: null, verdicts: {} });
    return;
  }

  if (!cfg.configured) {
    // Leave the existing verdicts untouched. Writing an empty file here would
    // discard every previous judgement and make the whole corpus look unjudged,
    // which is worse than skipping a run.
    log('judge', 'no credential for TYPESAFE_API_KEY or LLM_API_KEY: judging skipped, verdicts left as they were');
    return;
  }

  // Reuse verdicts for candidates that have not changed. A candidate's identity
  // is its id, which is derived from its section and ordinal, so an existing
  // verdict still applies.
  const previousFile = await readJson(OUT, {});
  const previous = previousFile?.verdicts ?? {};
  const targetIds = new Set(all.map((q) => q.id));
  const kept = Object.fromEntries(
    Object.entries(previous).filter(([id]) => targetIds.has(id)),
  );
  const todoChoice = REJUDGE ? all : all.filter((q) => !kept[q.id]?.choice);
  const todoDifficulty = REJUDGE ? all : all.filter((q) => typeof kept[q.id]?.difficulty !== 'number');

  log(
    'judge',
    `${all.length} candidates, ${Object.keys(kept).length} already judged, ${todoChoice.length} to judge quality, ${todoDifficulty.length} to score difficulty`,
  );
  if (!todoChoice.length && !todoDifficulty.length) {
    // Preserve the original timestamp: rewriting it makes the file differ on
    // every run, which turns a no-op refresh into a 14,000-line pull request.
    await writeJson(OUT, {
      generatedAt: previousFile?.generatedAt ?? new Date().toISOString(),
      model: cfg.model,
      configured: cfg.configured,
      categories: Object.keys(DEFECT_CATEGORIES),
      histogram: histogramOf(kept),
      verdicts: sortKeys(kept),
    });
    log('judge', 'nothing new to judge; kept existing verdicts');
    return;
  }

  log('judge', `via ${cfg.model} at ${cfg.baseUrl} (key from ${cfg.keySource})`);

  // Score difficulty in the same pass. Two primitives per candidate, both
  // batched: the fairness choice and the five-level score.
  let difficulty = new Map();
  if (todoDifficulty.length) {
    const difficultyItems = todoDifficulty.map((q) => ({
      key: q.id,
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      file: q.citations?.[0]?.file ?? null,
      hasAttachment: Boolean(q.attachments?.length),
    }));
    try {
      difficulty = await scoreDifficulty(difficultyItems, cfg);
    } catch (err) {
      // Difficulty is a calibration aid, not a gate. Losing it must not block the
      // quality judgement or the deploy.
      log('judge', `difficulty scoring skipped: ${err.message}`);
    }
  }

  let results = new Map();
  if (todoChoice.length) {
    const items = todoChoice.map((q) => ({
      key: q.id,
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      quote: q.citations?.[0]?.quote ?? '',
    }));
    try {
      results = await judge(items, cfg);
    } catch (err) {
      log('judge', `judging failed: ${err.message}`);
      log('judge', 'writing an empty verdict file so the pipeline can continue');
      await writeJson(OUT, {
        generatedAt: new Date().toISOString(),
        model: cfg.model,
        configured: true,
        error: err.message,
        verdicts: {},
      });
      return;
    }
  }

  const verdicts = { ...kept };
  for (const [key, v] of results) {
    verdicts[key] = { ...(verdicts[key] ?? {}), ...v };
  }
  for (const [key, d] of difficulty) {
    if (d?.difficulty != null && verdicts[key]) {
      verdicts[key] = {
        ...verdicts[key],
        difficulty: d.difficulty,
        difficultyDistribution: d.distribution,
      };
    }
  }
  const histogram = histogramOf(verdicts);

  await writeJson(OUT, {
    generatedAt: new Date().toISOString(),
    model: cfg.model,
    configured: true,
    categories: Object.keys(DEFECT_CATEGORIES),
    histogram,
    verdicts: sortKeys(verdicts),
  });

  const scored = Object.values(verdicts).filter((v) => typeof v.difficulty === 'number');
  if (scored.length) {
    const mean = scored.reduce((a, v) => a + v.difficulty, 0) / scored.length;
    log('judge', `difficulty: ${scored.length} scored, mean ${mean.toFixed(2)}`);
  }

  log('judge', `histogram: ${JSON.stringify(histogram)}`);
  const good = histogram.good_exam_item ?? 0;
  log('judge', `${good}/${Object.keys(verdicts).length} rated good exam items`);
}

await main();
