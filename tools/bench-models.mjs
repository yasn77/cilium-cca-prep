#!/usr/bin/env node
/**
 * Benchmark generator models on the real task.
 *
 * Picking a model by price per million tokens is the wrong measurement: what
 * matters is how many questions survive the gates per pound. A model that is
 * twice as cheap and three times likelier to mangle a verbatim quote is the
 * more expensive choice.
 *
 * Runs the same prompt over a fixed sample of sections and reports, per model:
 * acceptance rate through the real validators, scenario share, latency, tokens,
 * and a cost estimate.
 *
 *   NANOGPT_API_KEY=... node tools/bench-models.mjs
 *   node tools/bench-models.mjs --models a,b --sections 6
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, log, quotePresent, writeJson } from './lib.mjs';
import { chat, extractJson, getUsage, configure } from './llm.mjs';

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const MODELS = argOf('models', '')
  ? argOf('models').split(',')
  : [
      'deepseek/deepseek-v4.1-flash-1017',
      'deepseek/deepseek-v4.1-flash-1017-uncensored',
      'z-ai/glm-5.3-flash',
      'deepseek/deepseek-v4-flash-0423',
      'minimax/minimax-m3.1-flash',
    ];
const SECTIONS_TO_USE = Number(argOf('sections', '6'));

// Mirrors tools/gen-ai.mjs so the benchmark measures the real thing.
const SYSTEM_PROMPT = `You write multiple-choice exam questions for a study app used to prepare engineers for the Cilium Certified Associate (CCA) certification.

Hard rules, in order of importance:
1. Every fact in the question and in the correct answer must come from the SOURCE EXCERPT provided. Do not use knowledge from elsewhere.
2. Exactly one option must be correct.
3. The "quote" field must be copied verbatim from the SOURCE EXCERPT — a contiguous run of at least 40 characters that contains the fact the answer depends on.
4. Write scenario questions where the excerpt allows it.
5. British English with Oxford spelling in the explanation, except inside code, flags and resource names.
6. No question may depend on a diagram, an image, or command output not in the excerpt.

Return JSON only:
{"questions":[{"stem":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"answer":"a","explanation":"...","optionRationale":{"b":"...","c":"...","d":"..."},"quote":"verbatim excerpt text","yieldSource":"scenario"}]}

yieldSource must be exactly one of these four strings, spelled exactly:
  "scenario"   a situation is described and the reader must reason about it
  "contrast"   two approaches or modes are distinguished
  "attribute"  a resource, field, flag or annotation is identified
  "definition" a concept is defined`;

function buildPrompt(section, need) {
  return `DOMAIN: ${section.domain}
COMPETENCY: ${section.competency ?? 'general'}
SECTION TITLE: ${section.headingPath.join(' > ')}

SOURCE EXCERPT (the only permitted source of facts):
"""
${section.text.slice(0, 6000)}
"""

Write ${need} questions about this excerpt. At least ${Math.max(1, Math.ceil(need * 0.25))} must be scenario-based. Return JSON only.`;
}

/** The same validity rules gen-ai applies, minus the id assignment. */
function validate(row, section) {
  const reasons = [];
  const clean = (s) => String(s ?? '').replace(/``([^`]+)``/g, '`$1`').trim();
  const stem = clean(row.stem);
  const options = Array.isArray(row.options) ? row.options.map((o) => ({ ...o, text: clean(o.text) })) : [];
  const explanation = clean(row.explanation);
  const quote = String(row.quote ?? '').trim();

  if (stem.length < 20) reasons.push('stem-too-short');
  if (options.length < 4) reasons.push('too-few-options');
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) reasons.push('duplicate-option-ids');
  if (!ids.includes(row.answer)) reasons.push('answer-not-an-option');
  if (new Set(options.map((o) => o.text.toLowerCase())).size !== options.length) reasons.push('duplicate-option-text');
  if (options.some((o) => !o.text || o.text.length < 3)) reasons.push('empty-option');
  if (explanation.length < 40) reasons.push('explanation-too-short');
  if (quote.length < 40) reasons.push('quote-too-short');
  else if (!quotePresent(quote, section.text)) reasons.push('quote-not-in-source');

  const wrong = ids.filter((id) => id !== row.answer);
  const rationale = row.optionRationale ?? {};
  if (wrong.some((id) => !rationale[id] || String(rationale[id]).trim().length < 10)) reasons.push('missing-rationale');
  if (!['definition', 'attribute', 'contrast', 'scenario'].includes(row.yieldSource)) reasons.push('bad-yield-source');

  return reasons;
}

async function main() {
  const key = process.env.NANOGPT_API_KEY ?? process.env.LLM_API_KEY;
  if (!key) {
    log('bench', 'no NANOGPT_API_KEY or LLM_API_KEY set');
    process.exit(1);
  }
  const baseUrl = process.env.LLM_BASE_URL ?? 'https://nano-gpt.com/api/v1';

  const data = JSON.parse(await readFile(path.join(ROOT, 'corpus', 'sections.json'), 'utf8'));
  // A fixed, deterministic sample across domains so every model sees identical input.
  const verified = data.sections.filter(
    (s) => s.renderStatus === 'verified' && s.renderedAnchor && s.wordCount >= 120,
  );
  const byDomain = new Map();
  for (const s of verified) {
    if (!byDomain.has(s.domain)) byDomain.set(s.domain, []);
    byDomain.get(s.domain).push(s);
  }
  const sample = [...byDomain.values()]
    .map((list) => list[Math.floor(list.length / 3)])
    .filter(Boolean)
    .slice(0, SECTIONS_TO_USE);

  log('bench', `${MODELS.length} models x ${sample.length} sections, ${baseUrl}`);
  log('bench', `sections: ${sample.map((s) => s.file + '#' + s.renderedAnchor).join(', ')}`);

  const results = [];

  for (const model of MODELS) {
    configure({ baseUrl, apiKey: key, model, temperature: 0, maxTokens: 2500 });
    const before = getUsage();

    let accepted = 0;
    let produced = 0;
    let scenarios = 0;
    let totalMs = 0;
    const rejections = {};

    for (const section of sample) {
      const started = Date.now();
      let parsed;
      try {
        const { text } = await chat(
          [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(section, 3) },
          ],
          { cfg: { baseUrl, apiKey: key, model, temperature: 0, maxTokens: 2500, configured: true, modelName: model } },
        );
        parsed = extractJson(text);
      } catch (err) {
        rejections['request-failed'] = (rejections['request-failed'] ?? 0) + 1;
        log('bench', `  ${model}: ${section.id} failed: ${err.message.slice(0, 80)}`);
        continue;
      }
      totalMs += Date.now() - started;

      const rows = parsed?.questions ?? [];
      if (!rows.length) {
        rejections['unparseable'] = (rejections.unparseable ?? 0) + 1;
        continue;
      }
      produced += rows.length;
      for (const row of rows) {
        const reasons = validate(row, section);
        if (reasons.length) {
          for (const r of reasons) rejections[r] = (rejections[r] ?? 0) + 1;
          continue;
        }
        accepted += 1;
        if (row.yieldSource === 'scenario') scenarios += 1;
      }
    }

    const after = getUsage();
    const promptTokens = after.promptTokens - before.promptTokens;
    const completionTokens = after.completionTokens - before.completionTokens;

    const result = {
      model,
      accepted,
      produced,
      scenarios,
      acceptanceRate: produced ? accepted / produced : 0,
      scenarioRate: accepted ? scenarios / accepted : 0,
      msPerSection: Math.round(totalMs / Math.max(1, sample.length)),
      promptTokens,
      completionTokens,
      rejections,
    };
    results.push(result);

    log(
      'bench',
      `${model.padEnd(46)} ${String(accepted).padStart(2)}/${String(produced).padEnd(2)} accepted ` +
        `(${(result.acceptanceRate * 100).toFixed(0)}%), ` +
        `${(result.scenarioRate * 100).toFixed(0)}% scenario, ` +
        `${result.msPerSection}ms/section, ` +
        `${promptTokens}+${completionTokens} tok`,
    );
    if (Object.keys(rejections).length) log('bench', `  rejected: ${JSON.stringify(rejections)}`);
  }

  await writeJson(path.join(ROOT, 'data', 'model-benchmark.json'), {
    generatedAt: new Date().toISOString(),
    baseUrl,
    sections: sample.map((s) => s.id),
    results,
  });
  log('bench', 'wrote data/model-benchmark.json');
}

await main();
