/**
 * Shared helpers: stable IDs, citations, text utilities, JSON-lines IO.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { docs } from './config.mjs';

export const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * The identity of a citation target, and therefore of the ordinal pool a
 * question draws from.
 *
 * One entry point, because the id and the ordinal allocation must use the same
 * tuple. When they diverged, several sections that resolve to one rendered
 * anchor (a short section merged into its parent heading) each started their own
 * ordinal sequence at 0 and minted identical ids.
 */
export function idKey(file, anchor) {
  return `${file}|${anchor}`;
}

/**
 * Stable question id.
 *
 * Deliberately NOT derived from the stem text: a model re-run rewrites wording
 * on almost every generation, and an id that changes with the wording throws
 * away the learner's history, wrong-answer list and flags on every regeneration.
 * The identity of a question is "the nth question asked about this rendered
 * anchor", and that is stable across rewording.
 */
export function stableId(file, anchor, ordinal) {
  return createHash('sha256')
    .update(`${idKey(file, anchor)}|${ordinal}`)
    .digest('hex')
    .slice(0, 16);
}

/** The public URL of a citation, used both in the app and in link checking. */
export function citationUrl(file, anchor) {
  return `${docs.liveBase}/${file.replace(/\.rst$/, '/')}#${anchor}`;
}

export function tokenise(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_.\-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Cosine-free Jaccard similarity, adequate for de-duplication. */
export function similarity(a, b) {
  const A = new Set(tokenise(a));
  const B = new Set(tokenise(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export function normaliseSpace(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

/** Is `quote` present in `text` after whitespace and markup normalisation? */
export function quotePresent(quote, text) {
  const q = normaliseSpace(quote.replace(/[`*_]/g, ''))
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .toLowerCase();
  const t = normaliseSpace(text.replace(/[`*_]/g, ''))
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .toLowerCase();
  return t.includes(q);
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

export async function readJsonl(file) {
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return [];
  }
  return raw
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

export async function writeJsonl(file, rows) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
}

export function log(tag, msg) {
  process.stdout.write(`[${tag}] ${msg}\n`);
}
