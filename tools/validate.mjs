#!/usr/bin/env node
/**
 * Structural validation with no network access.
 *
 * Runs in the deploy workflow, so a corpus that would break the app cannot be
 * published. Checks the things the SPA assumes rather than the things the
 * generator hoped for.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, log } from './lib.mjs';

const DESCRIPTIONS = {
  id: (v) => typeof v === 'string' && /^[0-9a-f]{16}$/.test(v),
  schemaVersion: (v) => v === 1,
  domain: (v) => ['architecture', 'network-policy', 'service-mesh', 'observability', 'installation', 'cluster-mesh', 'ebpf', 'bgp'].includes(v),
  type: (v) => v === 'single',
  stem: (v) => typeof v === 'string' && v.length >= 20,
  answer: (v) => ['a', 'b', 'c', 'd', 'e'].includes(v),
  explanation: (v) => typeof v === 'string' && v.length >= 40,
  citations: (v) => Array.isArray(v) && v.length > 0 && v.every((c) => c.file && c.anchor && c.quote),
  yieldSource: (v) => ['definition', 'attribute', 'contrast', 'scenario'].includes(v),
  provenance: (v) => v && typeof v === 'object' && v.docsRef,
  // Optional, so an undefined value is fine; a present one must be well formed.
  attachments: (v) =>
    v === undefined ||
    (Array.isArray(v) &&
      v.length <= 2 &&
      v.every((a) => a && ['manifest', 'output', 'text', 'diagram'].includes(a.kind) && a.title && (a.kind === 'diagram' || (typeof a.body === 'string' && a.body.length >= 10)))),
};

function validateQuestion(q, index) {
  const problems = [];
  for (const [field, test] of Object.entries(DESCRIPTIONS)) {
    if (!test(q[field])) problems.push(`question ${index}: bad ${field}`);
  }
  if (!Array.isArray(q.options) || q.options.length < 4) {
    problems.push(`question ${index}: fewer than four options`);
  } else {
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length) {
      problems.push(`question ${index}: duplicate option ids`);
    }
    if (!q.options.some((o) => o.id === q.answer)) {
      problems.push(`question ${index}: answer is not an option`);
    }
    for (const o of q.options) {
      if (!o.text || String(o.text).trim().length < 2) problems.push(`question ${index}: empty option ${o.id}`);
    }
  }
  const wrong = (q.options ?? []).filter((o) => o.id !== q.answer);
  for (const o of wrong) {
    if (!q.optionRationale?.[o.id]) problems.push(`question ${index}: no rationale for ${o.id}`);
  }
  return problems;
}

/**
 * The study guide is published alongside the corpus, so a broken link or a
 * malformed day would reach the learner. Checked structurally: a URL is not
 * fetched here, but it must be absolute and https, and every item needs a title.
 */
async function validateGuide() {
  const problems = [];
  let guide;
  try {
    guide = JSON.parse(await readFile(path.join(ROOT, 'data', 'guide.json'), 'utf8'));
  } catch (e) {
    return [`guide.json is missing or unparseable: ${e.message}`];
  }

  if (!Array.isArray(guide.days) || guide.days.length !== 7) {
    problems.push(`guide must have exactly 7 days, found ${guide.days?.length}`);
  }
  if (!Array.isArray(guide.references) || !guide.references.length) {
    problems.push('guide has no references');
  }
  if (!guide.verifiedOn) problems.push('guide has no verifiedOn date');

  const checkItem = (item, where) => {
    if (!item || typeof item !== 'object') return problems.push(`${where}: item is not an object`);
    if (typeof item.title !== 'string' || item.title.trim().length < 3) {
      problems.push(`${where}: item has no title`);
    }
    if (item.url !== undefined) {
      if (!/^https:\/\//.test(item.url)) problems.push(`${where}: "${item.title}" url is not https`);
    }
  };

  for (const day of guide.days ?? []) {
    if (!Number.isInteger(day.day)) problems.push('a day has no number');
    if (!day.title) problems.push(`day ${day.day} has no title`);
    if (!Array.isArray(day.items) || !day.items.length) problems.push(`day ${day.day} has no items`);
    for (const item of day.items ?? []) checkItem(item, `day ${day.day}`);
  }
  for (const group of guide.references ?? []) {
    if (!group.group) problems.push('a reference group has no name');
    for (const item of group.items ?? []) checkItem(item, `refs/${group.group}`);
  }

  return problems;
}

async function main() {
  const corpus = JSON.parse(await readFile(path.join(ROOT, 'data', 'corpus.json'), 'utf8'));
  const quarantine = JSON.parse(await readFile(path.join(ROOT, 'data', 'quarantine.json'), 'utf8'));

  const problems = [];
  if (corpus.schemaVersion !== 1) problems.push(`corpus schemaVersion ${corpus.schemaVersion}, expected 1`);
  if (!Array.isArray(corpus.questions)) problems.push('corpus.questions is not an array');

  const ids = new Set();
  (corpus.questions ?? []).forEach((q, i) => {
    problems.push(...validateQuestion(q, i));
    if (ids.has(q.id)) problems.push(`question ${i}: duplicate id ${q.id}`);
    ids.add(q.id);
  });

  for (const q of quarantine.questions ?? []) {
    if (!q.rejection?.gate || !q.rejection?.reason) {
      problems.push(`quarantined ${q.id}: missing rejection reason`);
    }
  }

  if (!(corpus.questions ?? []).length) problems.push('corpus has no questions');

  problems.push(...(await validateGuide()));

  if (problems.length) {
    for (const p of problems.slice(0, 40)) log('validate', `FAIL ${p}`);
    log('validate', `${problems.length} problems; refusing to publish`);
    process.exit(1);
  }
  log('validate', `ok: ${corpus.questions.length} questions, ${quarantine.questions?.length ?? 0} quarantined`);
}

await main();
