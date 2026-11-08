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
import { readJsonl, writeJson, log } from './lib.mjs';
import { judge, judgeConfig, DEFECT_CATEGORIES } from './systemone.mjs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const TEMPLATES = path.join(ROOT, 'candidates', 'templates.jsonl');
const AI = path.join(ROOT, 'candidates', 'ai.jsonl');
const OUT = path.join(ROOT, 'candidates', 'verdicts.json');

const args = new Set(process.argv.slice(2));
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) ?? '').split('=')[1]) || 0;

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
    log('judge', 'no credential for TYPESAFE_API_KEY or LLM_API_KEY: judging skipped');
    await writeJson(OUT, {
      generatedAt: new Date().toISOString(),
      model: null,
      configured: false,
      reason: 'no credential',
      verdicts: {},
    });
    return;
  }

  log('judge', `${all.length} candidates via ${cfg.model} at ${cfg.baseUrl} (key from ${cfg.keySource})`);

  const items = all.map((q) => ({
    key: q.id,
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    quote: q.citations?.[0]?.quote ?? '',
  }));

  let results;
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

  const verdicts = {};
  const histogram = {};
  for (const [key, v] of results) {
    verdicts[key] = v;
    histogram[v.choice] = (histogram[v.choice] ?? 0) + 1;
  }

  await writeJson(OUT, {
    generatedAt: new Date().toISOString(),
    model: cfg.model,
    configured: true,
    categories: Object.keys(DEFECT_CATEGORIES),
    histogram,
    verdicts,
  });

  log('judge', `histogram: ${JSON.stringify(histogram)}`);
  const good = histogram.good_exam_item ?? 0;
  log('judge', `${good}/${all.length} rated good exam items`);
}

await main();
