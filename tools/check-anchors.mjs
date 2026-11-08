#!/usr/bin/env node
/**
 * Check that every section anchor actually exists on the rendered site.
 *
 * The rst is the source of truth for content, but the rendered site is the
 * source of truth for whether a citation link works. A file can exist in the
 * repository and still be unpublished: `operations/troubleshooting_clustermesh.rst`
 * is present at v1.20.4 and returns 404 from docs.cilium.io.
 *
 * One request per file, not per section: the page content contains all of its
 * section ids. Then every section in that file is checked against that page.
 *
 * Usage:
 *   node tools/check-anchors.mjs            # sample: every Nth section's file
 *   node tools/check-anchors.mjs --all      # every file
 *   node tools/check-anchors.mjs --fix      # write results to data/anchor-check.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { docs } from './config.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');
const OUT = path.join(ROOT, 'data', 'anchor-check.json');

const args = new Set(process.argv.slice(2));
const ALL = args.has('--all');
const SAMPLE_EVERY = 1;
const CONCURRENCY = 6;

function log(msg) {
  process.stdout.write(`[check-anchors] ${msg}\n`);
}

async function fetchPage(file) {
  const url = `${docs.liveBase}/${file.replace(/\.rst$/, '/')}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return { url, status: res.status, ids: null };
  const body = await res.text();
  const ids = new Set([...body.matchAll(/id="([^"]*)"/g)].map((m) => m[1]));
  return { url, status: res.status, ids };
}

async function main() {
  const data = JSON.parse(await readFile(SECTIONS, 'utf8'));
  const byFile = new Map();
  data.sections.forEach((s, i) => {
    if (!ALL && i % SAMPLE_EVERY !== 0) return;
    if (!byFile.has(s.file)) byFile.set(s.file, []);
    byFile.get(s.file).push(s);
  });

  const files = [...byFile.keys()];
  log(`checking ${files.length} files`);

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor];
      cursor += 1;
      const page = await fetchPage(file);
      for (const s of byFile.get(file)) {
        if (page.ids === null) {
          results.push({ id: s.id, file, anchor: s.anchor, status: page.status, ok: false, reason: 'page-not-published' });
        } else if (page.ids.has(s.anchor)) {
          results.push({ id: s.id, file, anchor: s.anchor, status: page.status, ok: true });
        } else {
          results.push({ id: s.id, file, anchor: s.anchor, status: page.status, ok: false, reason: 'anchor-missing' });
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok);
  const byReason = {};
  for (const b of bad) byReason[b.reason] = (byReason[b.reason] ?? 0) + 1;

  await writeFile(
    OUT,
    `${JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, ok, failed: bad.length, byReason, failures: bad }, null, 2)}\n`,
  );

  log(`${ok}/${results.length} anchors resolve (${JSON.stringify(byReason)})`);
  if (bad.length) {
    for (const b of bad.slice(0, 20)) log(`  FAIL ${b.id} (${b.reason}, HTTP ${b.status})`);
  }
  if (bad.length && args.has('--strict')) process.exit(1);
}

await main();
