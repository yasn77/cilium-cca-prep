#!/usr/bin/env node
/**
 * Renumber question ids deterministically.
 *
 * Two candidates can share an id because ordinals were allocated from a count,
 * and that count changes whenever the filtering in front of it changes. `gen-ai`
 * now allocates from the highest ordinal in use, which stops it recurring; this
 * fixes a file that already has collisions.
 *
 * Repairs by regrouping rather than by patching each collision: every section's
 * candidates are numbered 0..n-1 in file order, which is stable, obviously
 * correct, and cannot cascade. Ids therefore change for some questions that were
 * not duplicated — the alternative was a cascade where a repaired id collided
 * with a later one, and a handful of lost local answers is cheaper than an id
 * scheme nobody can reason about.
 *
 *   node tools/repair-ids.mjs            # report only
 *   node tools/repair-ids.mjs --write
 */
import path from 'node:path';
import { ROOT, readJsonl, writeJsonl, stableId, idKey, log } from './lib.mjs';

const WRITE = process.argv.includes('--write');
const FILES = ['templates.jsonl', 'ai.jsonl'].map((f) => path.join(ROOT, 'candidates', f));

async function main() {
  const before = [];
  for (const file of FILES) {
    for (const row of await readJsonl(file)) before.push({ file, row });
  }

  // Group by the tuple stableId hashes, not by section.id: merged sections share
  // a rendered anchor and therefore share one ordinal pool.
  const keyOf = (row) => {
    const c = row.citations?.[0];
    return c?.file && c?.anchor ? idKey(c.file, c.anchor) : (row.provenance?.sectionId ?? 'unknown');
  };

  // Snapshot before any mutation: counting duplicates afterwards reads the new
  // ids and always reports zero, which silently skipped the repair.
  const duplicateIdsBefore = before.length - new Set(before.map(({ row }) => row.id)).size;

  let changed = 0;
  const seen = new Set();
  const nextOrdinal = new Map();

  for (const { row } of before) {
    const key = keyOf(row);
    const file = row.citations?.[0]?.file ?? 'unknown';
    const anchor = row.citations?.[0]?.anchor ?? 'unknown';

    let ordinal = nextOrdinal.get(key) ?? 0;
    let id = stableId(file, anchor, ordinal);
    while (seen.has(id)) {
      ordinal += 1;
      id = stableId(file, anchor, ordinal);
    }
    nextOrdinal.set(key, ordinal + 1);

    if (row.id !== id || row.ordinal !== ordinal) changed += 1;
    row.id = id;
    row.ordinal = ordinal;
    seen.add(id);
  }

  log('repair-ids', `${before.length} candidates, ${duplicateIdsBefore} duplicate ids before`);
  log('repair-ids', `${changed} rows changed, ${seen.size} unique ids after`);

  if (!duplicateIdsBefore) {
    log('repair-ids', 'nothing to repair');
    return;
  }
  if (!WRITE) {
    log('repair-ids', 'dry run; pass --write to apply');
    return;
  }

  // Write the rows that were actually renumbered. Re-reading the files here
  // would discard the mutations and then dedupe by the old ids, deleting
  // questions instead of renumbering them.
  for (const file of FILES) {
    const rows = before.filter((e) => e.file === file).map((e) => e.row);
    const seenHere = new Set();
    const deduped = rows.filter((row) => {
      if (seenHere.has(row.id)) {
        log('repair-ids', `dropping duplicate ${row.id}`);
        return false;
      }
      seenHere.add(row.id);
      return true;
    });
    await writeJsonl(file, deduped);
    log('repair-ids', `rewrote ${path.basename(file)}: ${deduped.length} rows`);
  }
}

await main();
