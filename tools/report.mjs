#!/usr/bin/env node
/**
 * Evidence artifact.
 *
 * Written for a reader who does not trust the pipeline. It states what was
 * pulled, what was dropped and why, what each gate rejected, what the judge
 * thought, and — explicitly — which questions the mechanical checks cannot
 * adjudicate. That last section is the honest part: a pipeline that claims
 * complete verification is lying.
 */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { domains, quota, docs, blueprintFiles } from './config.mjs';
import { ROOT, readJson, log } from './lib.mjs';

const OUT = path.join(ROOT, 'data', 'report.md');

function pct(n, d) {
  if (!d) return '0%';
  return `${((n / d) * 100).toFixed(1)}%`;
}

async function main() {
  const sections = JSON.parse(await readFile(path.join(ROOT, 'corpus', 'sections.json'), 'utf8'));
  const sources = await readJson(path.join(ROOT, 'data', 'sources.json'), {});
  const corpus = await readJson(path.join(ROOT, 'data', 'corpus.json'), { questions: [] });
  const quarantine = await readJson(path.join(ROOT, 'data', 'quarantine.json'), { questions: [] });
  const verdicts = await readJson(path.join(ROOT, 'candidates', 'verdicts.json'), {});
  const blind = await readJson(path.join(ROOT, 'data', 'blind-set.json'), { questions: [] });

  const qs = corpus.questions ?? [];
  const byDomain = {};
  for (const d of Object.keys(domains)) byDomain[d] = qs.filter((q) => q.domain === d).length;
  const byYield = qs.reduce((acc, q) => {
    acc[q.yieldSource] = (acc[q.yieldSource] ?? 0) + 1;
    return acc;
  }, {});
  const scenarioShare = qs.length ? qs.filter((q) => q.yieldSource === 'scenario').length / qs.length : 0;

  const qgates = (quarantine.questions ?? []).reduce((acc, q) => {
    const g = q.rejection?.gate ?? 'unknown';
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  // Questions the mechanical gates cannot fully adjudicate: those whose answer
  // is a bare term shorter than the entailment threshold, or which survived
  // without a judge verdict.
  const weak = qs.filter(
    (q) =>
      q.provenance?.checks?.judgeVerdict !== 'good_exam_item' ||
      (q.options.find((o) => o.id === q.answer)?.text ?? '').split(/\s+/).length < 4,
  );

  const lines = [];
  lines.push('# Corpus report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Source');
  lines.push('');
  lines.push('| Item | Value |');
  lines.push('|---|---|');
  lines.push(`| Repository | \`${sources?.docs?.repo ?? docs.repo}\` |`);
  lines.push(`| Ref | \`${sources?.docs?.ref ?? docs.ref}\` |`);
  lines.push(`| Commit | \`${sources?.docs?.sha ?? 'unknown'}\` |`);
  lines.push(`| Retrieval route | ${sources?.docs?.route ?? 'unknown'} |`);
  lines.push(`| Files pulled | ${sources?.docs?.file_count ?? '—'} |`);
  lines.push(`| Bytes | ${sources?.docs?.byte_count ?? '—'} |`);
  lines.push(`| Licence | CC BY 4.0 (documentation); Apache-2.0 (code) |`);
  lines.push('');
  lines.push('## Sections');
  lines.push('');
  lines.push(`Parsed **${sections.counts?.sections ?? 0}** sections from ${sections.counts?.files ?? 0} files, ` +
    `${sections.counts?.words ?? 0} words. ` +
    `Anchors verified against the live site: **${sections.renderSummary?.verified ?? 0}**, ` +
    `unpublished pages: ${sections.renderSummary?.unpublished ?? 0}, ` +
    `unmatched: ${sections.renderSummary?.unmatched ?? 0}.`);
  lines.push('');
  lines.push('Dropped:');
  lines.push('');
  const dropped = sections.counts?.dropped ?? {};
  for (const [k, v] of Object.entries(dropped)) lines.push(`- \`${k}\`: ${v}`);
  lines.push('');
  lines.push('## Corpus');
  lines.push('');
  lines.push(`**${qs.length} questions** in the shipped corpus, **${quarantine.questions?.length ?? 0}** quarantined.`);
  if (corpus.counts?.blueprintStarved) {
    lines.push('');
    lines.push(`**${corpus.counts.blueprintStarved}** blueprint files produced no questions.`);
  }
  lines.push('');
  lines.push('| Domain | Weight | Questions | Floor | Status |');
  lines.push('|---|---|---|---|---|');
  for (const [d, meta] of Object.entries(domains)) {
    const n = byDomain[d];
    lines.push(`| ${meta.label} | ${meta.weight}% | ${n} | ${meta.floor} | ${n >= meta.floor ? 'met' : '**short**'} |`);
  }
  lines.push('');

  // Competency detail: a domain can meet its floor through one well-covered
  // competency while others sit empty, and a learner revising a specific topic
  // needs to see that rather than a domain-level total.
  const competencyCounts = {};
  for (const q of qs) {
    const d = q.domain;
    const c = q.competency ?? 'unmapped';
    competencyCounts[d] ??= {};
    competencyCounts[d][c] = (competencyCounts[d][c] ?? 0) + 1;
  }
  if (Object.keys(competencyCounts).length) {
    lines.push('<details><summary>Coverage by competency</summary>');
    lines.push('');
    for (const [d, comps] of Object.entries(competencyCounts)) {
      lines.push(`**${domains[d]?.label ?? d}**`);
      lines.push('');
      for (const [c, n] of Object.entries(comps).sort((a, b) => b[1] - a[1])) {
        const thin = c !== 'unmapped' && n < quota.perCompetencyMin ? ' _(thin)_' : '';
        lines.push(`- \`${c}\` — ${n}${thin}`);
      }
      lines.push('');
    }
    lines.push('</details>');
    lines.push('');
  }
  lines.push('| Yield source | Count |');
  lines.push('|---|---|');
  for (const [k, v] of Object.entries(byYield).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
  lines.push('');
  lines.push(`Scenario share: **${(scenarioShare * 100).toFixed(1)}%** (floor ${quota.scenarioMinShare * 100}%).`);
  lines.push('');
  lines.push('## Difficulty');
  lines.push('');
  const dbands = corpus.counts?.difficulty ?? {};
  const scored = qs.filter((q) => typeof q.difficulty === 'number');
  if (scored.length) {
    const vals = scored.map((q) => q.difficulty).sort((a, b) => a - b);
    const median = vals[Math.floor(vals.length / 2)];
    lines.push(`SystemOne scored **${scored.length}** of ${qs.length} questions on a 1–5 scale where **3.0 is the real exam**. ` +
      `Median **${median.toFixed(2)}**.`);
    lines.push('');
    lines.push('| Band | Questions | What it is |');
    lines.push('|---|---|---|');
    lines.push(`| 1.0–2.0 | ${dbands['1.0-2.0'] ?? 0} | Foundational recall |`);
    lines.push(`| 2.0–2.5 | ${dbands['2.0-2.5'] ?? 0} | Easier than the exam |`);
    lines.push(`| 2.5–3.5 | ${dbands['2.5-3.5'] ?? 0} | **The real exam band** |`);
    lines.push(`| 3.5–4.5 | ${dbands['3.5-4.5'] ?? 0} | Harder than the exam |`);
    lines.push(`| 4.5–5.0 | ${dbands['4.5-5.0'] ?? 0} | Expert / deep dive |`);
    lines.push('');
    lines.push('Difficulty is a calibration aid for the practice slider, not an official metric. ' +
      'The exam is associate-level; a corpus that skews above the middle band is a corpus that over-trains.');
  } else {
    lines.push('No question has a difficulty score yet.');
  }
  lines.push('');

  if (corpus.counts?.difficulty) {
    lines.push('### Difficulty calibration');
    lines.push('');
    lines.push('Difficulty is scored on a 1.0–5.0 scale by SystemOne as a calibration aid for the app slider (where 3.0 targets the real exam). It is a model judgement, not an official exam metric.');
    lines.push('');
    lines.push('| Band | Questions | Share |');
    lines.push('|---|---|---|');
    for (const [band, n] of Object.entries(corpus.counts.difficulty)) {
      lines.push(`| ${band} | ${n} | ${pct(n, qs.length)} |`);
    }
    lines.push('');
  }

  // Blueprint allow-list coverage and zero-question table.
  {
    const eligibleByFile = new Map();
    for (const sec of sections.sections ?? []) {
      if (sec.renderStatus !== 'verified' && sec.renderStatus !== 'verified-merged') continue;
      if (sec.wordCount < 50) continue;
      if (!blueprintFiles.includes(sec.file)) continue;
      eligibleByFile.set(sec.file, (eligibleByFile.get(sec.file) ?? 0) + 1);
    }
    const shippedByFile = new Map();
    for (const q of qs) {
      const f = q.citations?.[0]?.file;
      if (f) shippedByFile.set(f, (shippedByFile.get(f) ?? 0) + 1);
    }
    const zeroFiles = [...eligibleByFile.entries()].filter(([f]) => !shippedByFile.get(f));
    const blueprintQs = qs.filter((q) => blueprintFiles.includes(q.citations?.[0]?.file)).length;
    lines.push('### Blueprint coverage');
    lines.push('');
    lines.push(
      `**${blueprintQs} of ${qs.length} questions (${pct(blueprintQs, qs.length)})** cite one of the ${blueprintFiles.length} core CCA Study Guide / playlist files ` +
      `(${eligibleByFile.size - zeroFiles.length}/${eligibleByFile.size} eligible blueprint files represented).`,
    );
    lines.push('');
    if (zeroFiles.length) {
      lines.push('| Blueprint file with 0 questions | Eligible sections |');
      lines.push('|---|---|');
      for (const [f, n] of zeroFiles) lines.push(`| \`${f}\` | ${n} |`);
      lines.push('');
    }
  }
  lines.push('## Verification');
  lines.push('');
  lines.push('A candidate ships only if all four gates pass:');
  lines.push('');
  lines.push('1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.');
  lines.push('2. **Quote** — the quoted text appears verbatim in that section.');
  lines.push('3. **Entailment** — the correct option\'s distinctive words appear in the cited section, and the distractors do not all appear there too.');
  lines.push('4. **Judge** — SystemOne classified the item as `good_exam_item`.');
  lines.push('');
  lines.push('Quarantine by gate:');
  lines.push('');
  lines.push('| Gate | Rejected |');
  lines.push('|---|---|');
  for (const [g, n] of Object.entries(qgates).sort((a, b) => b[1] - a[1])) lines.push(`| ${g} | ${n} |`);
  lines.push('');
  if (verdicts?.histogram) {
    lines.push('Judge histogram:');
    lines.push('');
    lines.push('| Category | Count |');
    lines.push('|---|---|');
    for (const [k, v] of Object.entries(verdicts.histogram)) lines.push(`| ${k} | ${v} |`);
    lines.push('');
  }
  lines.push('## Known weak points');
  lines.push('');
  lines.push(`${weak.length} of ${qs.length} questions (${pct(weak.length, qs.length)}) are flagged here as weaker than the rest: ` +
    'either they survived without a judge verdict, or the correct answer is a term short enough that the ' +
    'entailment check is close to a string match rather than a claim about meaning.');
  lines.push('');
  if (weak.length) {
    lines.push('<details><summary>List</summary>');
    lines.push('');
    for (const q of weak.slice(0, 100)) lines.push(`- \`${q.id}\` — ${q.domain} — ${q.stem.slice(0, 90)}`);
    if (weak.length > 100) lines.push(`- …and ${weak.length - 100} more`);
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }
  lines.push('## Blind evaluation set');
  lines.push('');
  lines.push(`${blind.questions?.length ?? 0} questions held out from the practising corpus, sourced from the public ` +
    'CNCF practice-exam repository. Never shown in practice or exam simulation; used only for blind scoring.');
  lines.push('');
  lines.push('## What this report does not claim');
  lines.push('');
  lines.push('- That these questions resemble the real exam. They are anchored to the documentation the exam is written');
  lines.push('  against, which is a weaker and checkable claim.');
  lines.push('- That every shipped answer is correct. The gates prove the answer is supported by the cited passage; they');
  lines.push('  do not prove the passage was read correctly by the generator.');
  lines.push('- That coverage is exam-realistic across competencies. Domain floors are enforced; per-competency balance is');
  lines.push('  reported only indirectly through the competency field on each question.');
  lines.push('');

  const { writeFile, mkdir } = await import('node:fs/promises');
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, lines.join('\n'));
  log('report', `wrote data/report.md (${qs.length} questions, ${weak.length} weak, ${quarantine.questions?.length ?? 0} quarantined)`);
}

await main();
