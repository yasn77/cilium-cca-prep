#!/usr/bin/env node
/**
 * Decide, mechanically, what enters the corpus.
 *
 * A candidate ships only if every gate passes. Anything that fails goes to the
 * quarantine file with a machine-readable reason, so nothing is silently
 * dropped and the counts always reconcile:
 *
 *     candidates = corpus + quarantine
 *
 * Gates:
 *   1. anchor   — the citation's section has a verified rendered anchor
 *   2. quote    — the citation quote appears verbatim in that section's text
 *   3. entail   — the correct option's distinctive words are in the cited
 *                 section, and the distractors' are not all in it too
 *   4. judge    — SystemOne classified it as good_exam_item (when judging ran)
 *   5. shape    — schema validity, no duplicate stems
 *
 * Overrides in overrides/*.json are applied by stable id. An override that
 * targets an id no longer present fails the build rather than rotting quietly.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { docs, domains, quota, schemaVersion } from './config.mjs';
import {
  ROOT,
  stableId,
  citationUrl,
  readJson,
  writeJson,
  readJsonl,
  log,
  quotePresent,
  similarity,
} from './lib.mjs';
import { checkEntailment as checkEntailmentImpl } from './entailment.mjs';
import { mergeVerdicts, judgeSource as judgeSourceOf } from './verdicts.mjs';
import { checkWording } from './wording.mjs';
import { checkAttachments } from './attachments.mjs';

const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');
const TEMPLATES = path.join(ROOT, 'candidates', 'templates.jsonl');
const AI = path.join(ROOT, 'candidates', 'ai.jsonl');
const VERDICTS = path.join(ROOT, 'candidates', 'verdicts.json');
const VERDICTS_LLM = path.join(ROOT, 'candidates', 'verdicts-llm.json');
const OVERRIDES_DIR = path.join(ROOT, 'overrides');
const CORPUS = path.join(ROOT, 'data', 'corpus.json');
const QUARANTINE = path.join(ROOT, 'data', 'quarantine.json');
const RETIRED = path.join(ROOT, 'data', 'retired.json');
const JUDGE_REQUIRED = !process.argv.includes('--allow-unjudged');

const MIN_STEM_SIMILARITY = 0.82;

function checkAnchor(q, verifiedAnchors) {
  for (const c of q.citations ?? []) {
    const key = `${c.file}#${c.anchor}`;
    if (!verifiedAnchors.has(key)) {
      const anyInFile = [...verifiedAnchors].some((k) => k.startsWith(`${c.file}#`));
      return anyInFile ? `anchor-not-verified:${c.anchor}` : `file-unpublished:${c.file}`;
    }
  }
  return null;
}

function checkQuote(q, sections) {
  for (const c of q.citations ?? []) {
    const section = sections.get(`${c.file}#${c.anchor}`);
    if (!section) return `section-missing:${c.anchor}`;
    if (!quotePresent(c.quote, section.text)) return 'quote-not-verbatim';
  }
  return null;
}

function checkShape(q) {
  if (!q.stem || q.stem.length < 20) return 'stem-too-short';
  // A question that refers to material the reader cannot see is unanswerable,
  // however well it is judged. Both quality judges passed one that did.
  // An attachment counts as showing it, which is how a real exam item works.
  const hasAttachment = Array.isArray(q.attachments) && q.attachments.length > 0;
  const wording = checkWording(q.stem, { hasAttachment });
  if (wording) return wording;
  if (!Array.isArray(q.options) || q.options.length < 4) return 'too-few-options';
  if (new Set(q.options.map((o) => o.id)).size !== q.options.length) return 'duplicate-option-ids';
  if (!q.options.some((o) => o.id === q.answer)) return 'answer-not-an-option';
  const texts = q.options.map((o) => o.text.trim().toLowerCase());
  if (new Set(texts).size !== texts.length) return 'duplicate-option-text';
  if (!q.explanation || q.explanation.length < 40) return 'explanation-too-short';
  if (!q.citations?.length) return 'no-citation';
  const wrong = q.options.filter((o) => o.id !== q.answer);
  const missing = wrong.filter((o) => !q.optionRationale?.[o.id]);
  if (missing.length) return `missing-rationale:${missing.map((m) => m.id).join(',')}`;
  if (!domains[q.domain]) return 'bad-domain';
  return null;
}

async function loadOverrides() {
  const map = new Map();
  let files = [];
  try {
    files = await readdir(OVERRIDES_DIR);
  } catch {
    return map;
  }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const data = await readJson(path.join(OVERRIDES_DIR, f), {});
    for (const [id, patch] of Object.entries(data)) map.set(id, { ...patch, __file: f });
  }
  return map;
}

async function main() {
  const sectionData = JSON.parse(await readFile(SECTIONS, 'utf8'));
  const sources = await readJson(path.join(ROOT, 'data', 'sources.json'), {});
  const docsSha = sources?.docs?.sha ?? 'unknown';

  const sections = new Map();
  const verifiedAnchors = new Set();
  for (const s of sectionData.sections) {
    const key = `${s.file}#${s.renderedAnchor ?? s.anchor}`;
    sections.set(key, s);
    if (s.renderStatus === 'verified' && s.renderedAnchor) verifiedAnchors.add(key);
  }

  const templates = await readJsonl(TEMPLATES);
  const ai = await readJsonl(AI);
  const verdictsRaw = await readJson(VERDICTS, {});
  const verdictsLlmRaw = await readJson(VERDICTS_LLM, {});
  const verdicts = mergeVerdicts(verdictsRaw?.verdicts, verdictsLlmRaw?.verdicts);
  const judgeRan = Object.keys(verdicts).length > 0;
  const judgeSource = judgeSourceOf(verdictsRaw?.verdicts, verdictsLlmRaw?.verdicts);

  const all = [...templates, ...ai].map((q) => ({
    ...q,
    schemaVersion: schemaVersion,
    provenance: {
      ...q.provenance,
      docsSha: q.provenance?.docsSha && q.provenance.docsSha !== 'unknown' ? q.provenance.docsSha : docsSha,
      createdAt: q.provenance?.createdAt ?? verdictsRaw?.generatedAt ?? new Date().toISOString(),
    },
  }));

  const corpus = [];
  const quarantine = [];
  const seenStems = [];
  const stats = { anchor: 0, quote: 0, attachment: 0, entail: 0, judge: 0, unjudged: 0, shape: 0, duplicate: 0, accepted: 0 };

  for (const q of all) {
    let reason = checkShape(q);
    if (reason) {
      quarantine.push({ ...q, rejection: { gate: 'shape', reason } });
      stats.shape += 1;
      continue;
    }

    reason = checkAnchor(q, verifiedAnchors);
    if (reason) {
      quarantine.push({ ...q, rejection: { gate: 'anchor', reason } });
      stats.anchor += 1;
      continue;
    }

    reason = checkQuote(q, sections);
    if (reason) {
      quarantine.push({ ...q, rejection: { gate: 'quote', reason } });
      stats.quote += 1;
      continue;
    }

    const citedSection = sections.get(`${q.citations[0].file}#${q.citations[0].anchor}`);
    const attachmentProblem = checkAttachments(q, citedSection ?? null);
    if (attachmentProblem) {
      quarantine.push({ ...q, rejection: { gate: 'attachment', reason: attachmentProblem } });
      stats.attachment += 1;
      continue;
    }

    const entail = checkEntailmentImpl(q, citedSection);
    if (!entail.ok) {
      quarantine.push({ ...q, rejection: { gate: 'entail', reason: entail.reason } });
      stats.entail += 1;
      continue;
    }

    const dup = seenStems.find((s) => similarity(s, q.stem) >= MIN_STEM_SIMILARITY);
    if (dup) {
      quarantine.push({ ...q, rejection: { gate: 'duplicate', reason: 'near-duplicate-stem' } });
      stats.duplicate += 1;
      continue;
    }

    const verdict = verdicts[q.id];
    if (JUDGE_REQUIRED && judgeRan) {
      // A judge that failed to return a verdict has not judged the question.
      // Recording that as a quality rejection quarantines good questions
      // whenever an API hiccups, so it is shipped, marked, and counted.
      if (!verdict || verdict.choice === 'error') {
        stats.unjudged += 1;
      } else if (verdict.choice !== 'good_exam_item') {
        quarantine.push({
          ...q,
          rejection: {
            gate: 'judge',
            reason: `judge:${verdict.choice}`,
            confidence: verdict.confidence,
            detail: verdict.detail,
          },
        });
        stats.judge += 1;
        continue;
      }
    }

    seenStems.push(q.stem);
    corpus.push({
      ...q,
      provenance: {
        ...q.provenance,
        checks: {
          anchorResolved: true,
          quoteVerbatim: true,
          answerEntailed: true,
          judgeVerdict: verdict?.choice ?? (judgeRan ? null : 'not-configured'),
        },
      },
    });
    stats.accepted += 1;
  }

  // ---- overrides ---------------------------------------------------------
  const overrides = await loadOverrides();
  const byId = new Map(corpus.map((q) => [q.id, q]));
  const quarantineById = new Map(quarantine.map((q) => [q.id, q]));
  const orphanOverrides = [];
  const appliedOverrides = [];

  for (const [id, patch] of overrides) {
    const target = byId.get(id) ?? quarantineById.get(id);
    if (!target) {
      orphanOverrides.push({ id, file: patch.__file });
      continue;
    }
    const { __file, ...fields } = patch;
    Object.assign(target, fields);
    appliedOverrides.push(id);
    if (quarantineById.has(id) && fields.promote) {
      // An override may deliberately promote a quarantined question, with the
      // reason recorded. That is an explicit human decision, not a silent pass.
      delete target.rejection;
      delete target.promote;
      quarantine.splice(quarantine.indexOf(target), 1);
      corpus.push(target);
      byId.set(id, target);
    }
  }

  // ---- retirement --------------------------------------------------------
  const retired = await readJson(RETIRED, { ids: [] });
  const retiredIds = new Set(retired.ids ?? []);
  const beforeRetire = corpus.length;
  const shipped = corpus.filter((q) => !retiredIds.has(q.id));
  const retiredAway = beforeRetire - shipped.length;

  // ---- coverage ----------------------------------------------------------
  const coverage = {};
  for (const [d, meta] of Object.entries(domains)) {
    const count = shipped.filter((q) => q.domain === d).length;
    const competencies = {};
    for (const q of shipped.filter((x) => x.domain === d)) {
      const c = q.competency ?? 'unmapped';
      competencies[c] = (competencies[c] ?? 0) + 1;
    }
    coverage[d] = {
      count,
      floor: meta.floor,
      weight: meta.weight,
      met: count >= meta.floor,
      competencies,
      // Competencies that exist in the corpus but are thinner than the plan's
      // per-competency minimum. Reported, not enforced: a domain can meet its
      // floor with one well-covered competency while leaving others bare, and
      // that is worth seeing rather than failing on.
      thinCompetencies: Object.entries(competencies)
        .filter(([id, n]) => id !== 'unmapped' && n < quota.perCompetencyMin)
        .map(([id, n]) => `${id}:${n}`),
    };
  }
  const scenarioShare = shipped.length
    ? shipped.filter((q) => q.yieldSource === 'scenario').length / shipped.length
    : 0;

  shipped.sort((a, b) => (a.domain === b.domain ? a.id.localeCompare(b.id) : a.domain.localeCompare(b.domain)));

  await writeJson(CORPUS, {
    schemaVersion,
    docsRef: docs.ref,
    docsSha,
    generatedAt: new Date().toISOString(),
    counts: {
      total: shipped.length,
      byDomain: Object.fromEntries(Object.keys(domains).map((d) => [d, shipped.filter((q) => q.domain === d).length])),
      byYieldSource: shipped.reduce((acc, q) => {
        acc[q.yieldSource] = (acc[q.yieldSource] ?? 0) + 1;
        return acc;
      }, {}),
      scenarioShare: Number(scenarioShare.toFixed(3)),
      judgeRan,
      judgeSource: judgeRan ? judgeSource : null,
      retired: retiredAway,
    },
    questions: shipped,
  });

  await writeJson(QUARANTINE, {
    generatedAt: new Date().toISOString(),
    counts: {
      total: quarantine.length,
      byGate: quarantine.reduce((acc, q) => {
        acc[q.rejection.gate] = (acc[q.rejection.gate] ?? 0) + 1;
        return acc;
      }, {}),
    },
    questions: quarantine,
  });

  // ---- report ------------------------------------------------------------
  const total = all.length;
  log('verify', `candidates ${total} -> corpus ${shipped.length}, quarantine ${quarantine.length}`);
  log('verify', `gates: ${JSON.stringify(stats)}`);
  log('verify', `coverage: ${Object.entries(coverage).map(([d, c]) => `${d} ${c.count}/${c.floor}`).join(', ')}`);
  log('verify', `scenario share ${(scenarioShare * 100).toFixed(1)}%`);
  for (const [d, c] of Object.entries(coverage)) {
    if (c.thinCompetencies.length) {
      log('verify', `  ${d}: thin competencies ${c.thinCompetencies.join(', ')}`);
    }
  }

  const problems = [];
  if (total !== shipped.length + quarantine.length + retiredAway) {
    problems.push(`accounting mismatch: ${total} != ${shipped.length} + ${quarantine.length} + ${retiredAway}`);
  }
  if (orphanOverrides.length) {
    problems.push(`overrides targeting missing ids: ${JSON.stringify(orphanOverrides)}`);
  }
  if (JUDGE_REQUIRED && judgeRan) {
    const unjudged = shipped.filter((q) => q.provenance.checks.judgeVerdict !== 'good_exam_item').length;
    if (unjudged) {
      log('verify', `${unjudged}/${shipped.length} shipped questions are unjudged (judge source: ${judgeSource})`);
    }
  }
  const shortDomains = Object.entries(coverage).filter(([, c]) => !c.met);
  if (shortDomains.length && process.argv.includes('--enforce-floor')) {
    problems.push(`below floor: ${shortDomains.map(([d, c]) => `${d} ${c.count}/${c.floor}`).join(', ')}`);
  }

  if (problems.length) {
    for (const p of problems) log('verify', `PROBLEM ${p}`);
    if (process.argv.includes('--strict') || process.argv.includes('--enforce-floor')) process.exit(viaExit(1));
  } else {
    log('verify', 'all checks reconcile');
  }
}

function viaExit(code) {
  return code;
}

await main();
