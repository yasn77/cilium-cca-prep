#!/usr/bin/env node
/**
 * Reconcile section anchors against the rendered documentation site.
 *
 * Guessing Sphinx's section-id algorithm is a losing game: the rules differ by
 * builder version, duplicate headings become `idN`, some segments lose digits,
 * and a few source files are simply not published. The rendered HTML is the
 * only authority for whether a citation link lands in the right place.
 *
 * This tool fetches each file's rendered page once, extracts every `<section id>`
 * with its heading text, and matches them to our parsed sections by normalised
 * heading text. Matching on text rather than position is deliberate: the same
 * heading can appear twice in a file, and position drifts when a section is
 * merged with a sibling.
 *
 * Output: corpus/sections.json gains a `renderedAnchor` (verified) or
 * `renderStatus: "unpublished"`. `tools/verify.mjs` refuses to ship a question
 * whose citation lacks a verified anchor.
 *
 * Usage:
 *   node tools/resolve-anchors.mjs
 *   node tools/resolve-anchors.mjs --offline   # keep the previous resolution
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { docs } from './config.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');
const CACHE = path.join(ROOT, 'corpus', 'rendered-index.json');
const CONCURRENCY = 6;

const args = new Set(process.argv.slice(2));
const OFFLINE = args.has('--offline');

function log(msg) {
  process.stdout.write(`[resolve-anchors] ${msg}\n`);
}

/**
 * Normalise heading text so parsed rst and rendered HTML compare equal.
 *
 * The rendered heading carries a permalink anchor whose glyph is a private-use
 * character (U+F051 as of v1.20.4), not the arrow it looks like, so strip by
 * pattern rather than by codepoint: drop anything that is not a letter, digit,
 * space or a handful of meaningful punctuation marks.
 */
function normalise(text) {
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[`*]/g, '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s'"?.,:/()_+-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE, 'utf8'));
  } catch {
    return { docsRef: null, pages: {} };
  }
}

async function fetchRendered(file) {
  const url = `${docs.liveBase}/${file.replace(/\.rst$/, '/')}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return { url, status: res.status, sections: null };
  const body = await res.text();

  const sections = [];
  // Split on section openings, then look for the first heading inside each
  // block. A lazy quantifier over the whole document silently skips sections
  // whose heading sits past the capture window.
  const parts = body.split(/<section id="/);
  for (let i = 1; i < parts.length; i += 1) {
    const [id, ...rest] = parts[i].split('"');
    if (!id) continue;
    const block = rest.join('"');
    const head = block.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/);
    if (!head) continue;
    const text = head[2]
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    sections.push({ id, level: Number(head[1]), text });
  }
  return { url, status: res.status, sections };
}

async function main() {
  const data = JSON.parse(await readFile(SECTIONS, 'utf8'));
  const cache = await loadCache();

  if (cache.docsRef !== data.docsRef) cache.pages = {};
  cache.docsRef = data.docsRef;

  const files = [...new Set(data.sections.map((s) => s.file))];
  if (!OFFLINE) {
    log(`fetching ${files.length} rendered pages`);
    let cursor = 0;
    let fetched = 0;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (cursor < files.length) {
          const file = files[cursor];
          cursor += 1;
          const page = await fetchRendered(file);
          cache.pages[file] = page;
          fetched += 1;
          if (fetched % 25 === 0) log(`  ${fetched}/${files.length}`);
        }
      }),
    );
  } else {
    log(`offline: using cached index for ${Object.keys(cache.pages).length} pages`);
  }

  let verified = 0;
  let unpublished = 0;
  let unmatched = 0;
  const problems = [];
  // Merge bookkeeping: a section that absorbed short siblings must be matched
  // on its own heading, and the absorbed ones are dropped from the corpus.
  const mergedInto = new Map();

  for (const s of data.sections) {
    const page = cache.pages[s.file];
    if (!page || page.sections === null) {
      s.renderStatus = 'unpublished';
      s.renderedAnchor = null;
      unpublished += 1;
      continue;
    }
    const want = normalise(s.title);
    const hits = page.sections.filter((r) => normalise(r.text) === want);

    if (s.mergedFrom && s.mergedFrom.length > 1) {
      // The merged blob spans several headings; it must not be cited as if it
      // were one section, so record the union of its parts and let the
      // generator work from the first heading's anchor.
      const parts = s.mergedFrom.map((id) => {
        const part = data.sections.find((x) => x.id === id);
        if (!part) return null;
        const ph = page.sections.find((r) => normalise(r.text) === normalise(part.title));
        return ph ? { id: part.id, renderedAnchor: ph.id, title: part.title } : null;
      });
      const resolved = parts.filter(Boolean);
      s.mergedParts = resolved;
      s.renderedAnchor = resolved[0]?.renderedAnchor ?? null;
      s.renderStatus = resolved.length ? 'verified-merged' : 'unmatched';
      if (resolved.length) verified += 1;
      else {
        unmatched += 1;
        problems.push(`${s.id} :: merged section matched none of its parts`);
      }
      continue;
    }

    if (hits.length === 0) {
      // Mismatch between our parser and what the site renders; do not guess.
      s.renderStatus = 'unmatched';
      s.renderedAnchor = null;
      unmatched += 1;
      problems.push(`${s.id} :: heading "${s.title}" not found in rendered page`);
      continue;
    }
    const exact = hits.find((h) => h.id === s.anchor);
    s.renderedAnchor = (exact ?? hits[0]).id;
    s.renderStatus = 'verified';
    verified += 1;
  }
  void mergedInto;

  data.renderSummary = {
    checkedAt: new Date().toISOString(),
    verified,
    unpublished,
    unmatched,
    total: data.sections.length,
  };

  await writeFile(SECTIONS, `${JSON.stringify(data)}\n`);
  await writeFile(CACHE, `${JSON.stringify(cache)}\n`);

  log(`verified ${verified}/${data.sections.length}, unpublished ${unpublished}, unmatched ${unmatched}`);
  for (const p of problems.slice(0, 15)) log(`  ${p}`);
}

await main();
