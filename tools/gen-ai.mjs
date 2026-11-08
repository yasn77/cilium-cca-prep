#!/usr/bin/env node
/**
 * LLM question generation, one section at a time, quota-driven.
 *
 * Why per section rather than per file: a 41 KB BGP configuration page covers a
 * dozen distinct topics and a 329-byte table of contents covers none. Asking
 * per section keeps each question anchored to one coherent passage, which is
 * what makes the citation meaningful and the grounding check enforceable.
 *
 * Why quota-driven: an unconstrained run gives whatever the model finds most
 * quotable — usually policy YAML and Hubble flags — and starves eBPF and BGP.
 * Coverage is an input here, not a hope.
 *
 * Grounding is enforced twice: the prompt forbids outside facts, and every
 * candidate's quote is checked against the section text before it is written
 * out. A model that invents a fact cannot get past the second check.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { docs, domains, quota, providers } from './config.mjs';
import {
  ROOT,
  stableId,
  citationUrl,
  readJson,
  writeJson,
  writeJsonl,
  readJsonl,
  log,
  quotePresent,
} from './lib.mjs';
import { chat, generatorConfig, extractJson, getUsage } from './llm.mjs';

const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');
const OUT = path.join(ROOT, 'candidates', 'ai.jsonl');
const COVERAGE = path.join(ROOT, 'data', 'coverage.json');
const TEMPLATES = path.join(ROOT, 'candidates', 'templates.jsonl');

const args = new Set(process.argv.slice(2));
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) ?? '').split('=')[1]) || 0;
const PER_SECTION = Number((process.argv.find((a) => a.startsWith('--per-section=')) ?? '').split('=')[1]) || 3;
const RECHECK = args.has('--recheck');

// Sections shorter than this are too thin to carry a question on their own.
// The chunker's own floor is 120; keeping this equal to it means the whole
// verified index is generation-eligible, which matters for the domains that
// are documented in many short sections (eBPF, BGP, Cluster Mesh).
const MIN_GEN_WORDS = 120;

const SYSTEM_PROMPT = `You write multiple-choice exam questions for a study app used to prepare engineers for the Cilium Certified Associate (CCA) certification.

Hard rules, in order of importance:
1. Every fact in the question and in the correct answer must come from the SOURCE EXCERPT provided. Do not use knowledge from elsewhere, do not generalise beyond it, and do not invent flag names, resource names, defaults or numbers.
2. Exactly one option must be correct. The other three must be plausible to someone who has read about Cilium but is wrong on this specific point.
3. Cite by quoting. The "quote" field must be copied verbatim from the SOURCE EXCERPT — a contiguous run of text, at least 40 characters, that contains the fact the answer depends on.
4. Write scenario questions where the excerpt allows it: describe a situation and ask what happens or which option to use, rather than asking for a dictionary definition.
5. British English with Oxford spelling in the explanation, except inside quoted code, flags and resource names, which must reproduce the source exactly.
6. No question may depend on a diagram, an image, a table you cannot see, or on command output that is not in the excerpt.

Return JSON only, with this exact shape and nothing outside it:
{"questions":[{"stem":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"answer":"a","explanation":"...","optionRationale":{"b":"...","c":"...","d":"..."},"quote":"verbatim excerpt text","yieldSource":"scenario"}]}

yieldSource must be exactly one of these four strings, spelled exactly:
  "scenario"   a situation is described and the reader must reason about it
  "contrast"   two approaches or modes are distinguished
  "attribute"  a resource, field, flag or annotation is identified
  "definition" a concept is defined`;

function safeHost(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return String(baseUrl);
  }
}

function buildUserPrompt(section, need) {
  return `DOMAIN: ${domains[section.domain]?.label ?? section.domain}
COMPETENCY: ${section.competency ?? 'general'}
SECTION TITLE: ${section.headingPath.join(' > ')}

SOURCE EXCERPT (the only permitted source of facts):
"""
${section.text.slice(0, 6000)}
"""

Write ${need} question${need === 1 ? '' : 's'} about this excerpt. At least ${Math.max(1, Math.ceil(need * quota.scenarioMinShare))} must be scenario-based. Return JSON only.`;
}

async function generateForSection(section, need, cfg) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(section, need) },
  ];
  const { text, model } = await chat(messages, { cfg });
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) return { rows: [], rejected: 'unparseable-response' };
  return { rows: parsed.questions, model };
}

function validate(row, section, model, cfg) {
  const reasons = [];
  // Normalise doubled backticks (``devices``) to a single pair at the boundary,
  // so the corpus contains one convention and the renderer only has one case.
  const clean = (s) => String(s ?? '').replace(/``([^`]+)``/g, '`$1`').trim();
  row.stem = clean(row.stem);
  if (Array.isArray(row.options)) row.options = row.options.map((o) => ({ ...o, text: clean(o.text) }));
  row.explanation = clean(row.explanation);
  if (typeof row.stem !== 'string' || row.stem.trim().length < 20) reasons.push('stem-too-short');
  if (!Array.isArray(row.options) || row.options.length < 4) reasons.push('too-few-options');
  if (reasons.length) return { reasons };

  const ids = row.options.map((o) => o.id);
  const letters = ['a', 'b', 'c', 'd', 'e'];
  if (new Set(ids).size !== ids.length) reasons.push('duplicate-option-ids');
  if (!ids.every((id) => letters.includes(id))) reasons.push('bad-option-ids');
  if (!letters.slice(0, row.options.length).includes(row.answer)) reasons.push('answer-not-an-option');
  if (ids.filter((id) => id === row.answer).length !== 1) reasons.push('answer-not-unique');
  const texts = row.options.map((o) => String(o.text ?? '').trim().toLowerCase());
  if (new Set(texts).size !== texts.length) reasons.push('duplicate-option-text');
  if (row.options.some((o) => !o.text || String(o.text).trim().length < 3)) reasons.push('empty-option');

  if (typeof row.explanation !== 'string' || row.explanation.trim().length < 40) reasons.push('explanation-too-short');
  if (typeof row.quote !== 'string' || row.quote.trim().length < 40) reasons.push('quote-too-short');
  else if (!quotePresent(row.quote, section.text)) reasons.push('quote-not-in-source');

  const rationale = row.optionRationale ?? {};
  const wrongIds = ids.filter((id) => id !== row.answer);
  const missing = wrongIds.filter((id) => !rationale[id] || String(rationale[id]).trim().length < 10);
  if (missing.length) reasons.push(`missing-rationale:${missing.join(',')}`);

  if (!['definition', 'attribute', 'contrast', 'scenario'].includes(row.yieldSource)) reasons.push('bad-yield-source');

  // A question whose stem and answer are the same text is degenerate.
  const answerText = row.options.find((o) => o.id === row.answer)?.text ?? '';
  if (answerText && row.stem.includes(answerText) && answerText.length > 20) reasons.push('answer-leaked-in-stem');

  if (reasons.length) return { reasons };
  return {
    ok: true,
    row: {
      stem: row.stem.trim(),
      options: row.options.slice(0, 5).map((o) => ({ id: o.id, text: String(o.text).trim() })),
      answer: row.answer,
      explanation: row.explanation.trim(),
      optionRationale: Object.fromEntries(
        wrongIds.map((id) => [id, String(rationale[id]).trim()]),
      ),
      yieldSource: row.yieldSource,
      citations: [
        {
          file: section.file,
          anchor: section.renderedAnchor,
          title: section.title,
          quote: row.quote.trim(),
          url: citationUrl(section.file, section.renderedAnchor),
        },
      ],
      provenance: {
        generator: {
          kind: 'llm',
          provider: safeHost(cfg.baseUrl),
          model,
          temperature: cfg.temperature,
        },
        docsRef: docs.ref,
        docsSha: null,
        sectionId: section.id,
        createdAt: null,
      },
    },
  };
}

async function main() {
  const data = JSON.parse(await readFile(SECTIONS, 'utf8'));
  const sources = await readJson(path.join(ROOT, 'data', 'sources.json'), {});
  const docsSha = sources?.docs?.sha ?? 'unknown';

  const cfg = generatorConfig();
  if (!cfg.configured) {
    log('gen-ai', `no credential in ${providers.generator.keyEnv}: generation skipped, writing empty candidate file`);
    await writeJsonl(OUT, []);
    return;
  }

  const templates = await readJsonl(TEMPLATES);
  const existing = await readJsonl(OUT);
  const existingBySection = new Map();
  // Templates count towards a section's yield as well. Without this the model
  // asks the same section for questions the template tier already produced, and
  // the verifier quarantines them as near-duplicates after paying for them.
  for (const r of [...templates, ...existing]) {
    const sid = r.provenance?.sectionId;
    if (!sid) continue;
    if (!existingBySection.has(sid)) existingBySection.set(sid, []);
    existingBySection.get(sid).push(r);
  }

  // Coverage so far, so we only generate where there is a deficit.
  const perDomain = {};
  for (const d of Object.keys(domains)) perDomain[d] = 0;
  for (const r of [...templates, ...existing]) perDomain[r.domain] = (perDomain[r.domain] ?? 0) + 1;

  const deficits = Object.fromEntries(
    Object.entries(domains).map(([d, meta]) => [d, Math.max(0, meta.floor - perDomain[d])]),
  );

  log('gen-ai', `deficits: ${JSON.stringify(deficits)}`);
  log('gen-ai', `model ${cfg.model} @ ${cfg.baseUrl}`);

  const usable = data.sections.filter(
    (s) => s.renderStatus === 'verified' && s.renderedAnchor && s.wordCount >= MIN_GEN_WORDS,
  );

  // Round-robin across domains by remaining deficit.
  //
  // Sorting by deficit alone saturates one domain before touching the next,
  // which is visible in any partial run: an interrupted build has nothing at all
  // in half the domains. Interleaving means any prefix of the run is a usable,
  // balanced corpus.
  const byDomainSections = new Map();
  for (const s of usable) {
    if (!byDomainSections.has(s.domain)) byDomainSections.set(s.domain, []);
    byDomainSections.get(s.domain).push(s);
  }
  // Largest sections first within a domain: more distinct facts per request.
  for (const list of byDomainSections.values()) list.sort((a, b) => b.wordCount - a.wordCount);

  const seen = new Set();
  const order = [];
  const domainsByDeficit = () =>
    [...byDomainSections.keys()].sort((a, b) => (deficits[b] ?? 0) - (deficits[a] ?? 0));
  const queues = new Map([...byDomainSections].map(([d, list]) => [d, [...list]]));
  while ([...queues.values()].some((q) => q.length)) {
    for (const d of domainsByDeficit()) {
      const q = queues.get(d);
      if (!q || !q.length) continue;
      const next = q.shift();
      if (!next || seen.has(next.id)) continue;
      seen.add(next.id);
      order.push(next);
    }
  }

  const rows = [...existing];
  let generated = 0;
  let considered = 0;
  const rejections = {};

  // Sections are independent, so they run concurrently. The default suits a
  // cloud endpoint; a single local GPU needs GEN_CONCURRENCY=4 or lower, or the
  // requests queue and start timing out.
  const CONCURRENCY = Number(process.env.GEN_CONCURRENCY ?? providers.generator.defaultConcurrency);

  const work = [];
  for (const section of order) {
    const have = existingBySection.get(section.id)?.length ?? 0;
    const domainDeficit = deficits[section.domain] ?? 0;
    if (domainDeficit <= 0) continue;
    const need = Math.min(PER_SECTION - have, domainDeficit);
    if (need <= 0) continue;
    work.push({ section, need });
  }

  let cursor = 0;
  let budgetLeft = LIMIT || Number.POSITIVE_INFINITY;

  async function worker() {
    while (cursor < work.length) {
      if (budgetLeft <= 0) return;
      const item = work[cursor];
      cursor += 1;
      const { section, need } = item;
      if ((deficits[section.domain] ?? 0) <= 0) continue;
      budgetLeft -= 1;
      considered += 1;

      let result;
      try {
        result = await generateForSection(section, need, cfg);
      } catch (err) {
        log('gen-ai', `section ${section.id} failed: ${err.message}`);
        continue;
      }

      let acceptedForSection = 0;
      for (const raw of result.rows) {
        const v = validate(raw, section, result.model, cfg);
        if (!v.ok) {
          for (const reason of v.reasons) {
            const key = reason.split(':')[0];
            rejections[key] = (rejections[key] ?? 0) + 1;
          }
          continue;
        }
        v.row.provenance.docsSha = docsSha;
        v.row.id = stableId(section.file, section.renderedAnchor, (existingBySection.get(section.id)?.length ?? 0) + acceptedForSection);
        v.row.domain = section.domain;
        v.row.competency = section.competency ?? null;
        v.row.type = 'single';
        v.row.schemaVersion = 1;
        rows.push(v.row);
        acceptedForSection += 1;
        generated += 1;
        deficits[section.domain] -= 1;
      }
      if (acceptedForSection) {
        log('gen-ai', `${section.id}: +${acceptedForSection} (total ${rows.length})`);
        // Written incrementally so a long run that is interrupted still leaves
        // usable candidates behind rather than losing everything to one crash.
        if (rows.length % 5 === 0) await writeJsonl(OUT, rows);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await writeJsonl(OUT, rows);

  const coverage = {};
  for (const [d, meta] of Object.entries(domains)) {
    const count = rows.filter((r) => r.domain === d).length;
    coverage[d] = { count, floor: meta.floor, weight: meta.weight, met: count >= meta.floor };
  }
  const usage = getUsage();
  await writeJson(COVERAGE, {
    generatedAt: new Date().toISOString(),
    templates: templates.length,
    ai: rows.length,
    consideredSections: considered,
    usage,
    rejections,
    coverage,
  });

  log('gen-ai', `${generated} new candidates, ${rows.length} total in file`);
  log('gen-ai', `spent: ${usage.calls} calls, ${usage.promptTokens} prompt + ${usage.completionTokens} completion tokens`);
  log('gen-ai', `rejections: ${JSON.stringify(rejections)}`);
  for (const [d, c] of Object.entries(coverage)) {
    log('gen-ai', `  ${domains[d].label}: ${c.count}/${c.floor}${c.met ? '' : '  <-- short'}`);
  }
}

await main();
