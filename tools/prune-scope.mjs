#!/usr/bin/env node
/**
 * Drop candidates that no longer cite a page in scope.
 *
 * When the exam scope narrows — as it did when the corpus was recalibrated to
 * the official study-guide pages — existing candidates keep citing chapters that
 * are no longer included. Verification would quarantine them, which is correct
 * but leaves thousands of dead entries in quarantine.json and makes the report
 * unreadable.
 *
 * Pruning them from the candidate files instead means:
 *   - quarantine.json lists only questions that genuinely failed a gate
 *   - the next generation run sees the true deficit and refills it
 *
 *   node tools/prune-scope.mjs            # report only
 *   node tools/prune-scope.mjs --write
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { blueprintFiles, domains } from './config.mjs';
import { ROOT, readJson, readJsonl, writeJsonl, log } from './lib.mjs';

const WRITE = process.argv.includes('--write');
const FILES = ['templates.jsonl', 'ai.jsonl'].map((f) => path.join(ROOT, 'candidates', f));
const PER_SECTION_CAP = 6;

async function main() {
  const sectionsData = JSON.parse(await readFile(path.join(ROOT, 'corpus', 'sections.json'), 'utf8'));
  const corpusData = await readJson(path.join(ROOT, 'data', 'corpus.json'), { questions: [] });
  const inScope = new Set(
    sectionsData.sections
      .filter((s) => s.renderStatus === 'verified' || s.renderStatus === 'verified-merged')
      .map((s) => `${s.file}#${s.renderedAnchor ?? s.anchor}`),
  );
  const filesInScope = new Set(sectionsData.sections.map((s) => s.file));
  const bp = new Set(blueprintFiles);

  // Determine which shipped questions to keep when trimming legacy over-generated
  // sections down to the recalibrated domain target (~floor + 2 per domain),
  // guaranteeing >=1 question per blueprint file and preferring blueprint files
  // and lower difficulty.
  const shippedIds = new Set((corpusData.questions ?? []).map((q) => q.id));
  const keepShippedIds = new Set();
  {
    const byDom = {};
    for (const q of corpusData.questions ?? []) (byDom[q.domain] ??= []).push(q);
    for (const [d, meta] of Object.entries(domains)) {
      const list = byDom[d] ?? [];
      const tmplInDom = list.filter((q) => q.provenance?.generator?.kind === 'template').length;
      const aiList = list.filter((q) => q.provenance?.generator?.kind !== 'template');
      const target = Math.max(0, meta.floor + 2 - tmplInDom);
      const bySec = {};
      for (const q of aiList) {
        const sid = q.provenance?.sectionId || `${q.citations?.[0]?.file}#${q.citations?.[0]?.anchor}`;
        (bySec[sid] ??= []).push(q);
      }
      const secRank = new Map();
      for (const sList of Object.values(bySec)) {
        sList.sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
        sList.forEach((q, idx) => secRank.set(q.id, idx));
      }
      const seenBpFile = new Set(
        list
          .filter((q) => q.provenance?.generator?.kind === 'template')
          .map((q) => q.citations?.[0]?.file)
          .filter(Boolean),
      );
      const fileProtected = new Set();
      for (const q of [...aiList].sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3))) {
        const f = q.citations?.[0]?.file;
        if (bp.has(f) && !seenBpFile.has(f)) {
          seenBpFile.add(f);
          fileProtected.add(q.id);
        }
      }
      aiList.sort((a, b) => {
        const pa = fileProtected.has(a.id) ? 0 : 1;
        const pb = fileProtected.has(b.id) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        const bpa = bp.has(a.citations?.[0]?.file) ? 0 : 1;
        const bpb = bp.has(b.citations?.[0]?.file) ? 0 : 1;
        if (bpa !== bpb) return bpa - bpb;
        const ca = (secRank.get(a.id) ?? 0) >= PER_SECTION_CAP ? 1 : 0;
        const cb = (secRank.get(b.id) ?? 0) >= PER_SECTION_CAP ? 1 : 0;
        if (ca !== cb) return ca - cb;
        return (a.difficulty ?? 3) - (b.difficulty ?? 3);
      });
      for (const q of aiList.slice(0, Math.max(target, fileProtected.size))) {
        keepShippedIds.add(q.id);
      }
    }
  }

  for (const file of FILES) {
    const rows = await readJsonl(file);
    const keep = [];
    const drop = [];
    const secCount = new Map();
    for (const r of rows) {
      const c = r.citations?.[0];
      const scopeOk = c && filesInScope.has(c.file) && inScope.has(`${c.file}#${c.anchor}`);
      if (!scopeOk) {
        drop.push(r);
        continue;
      }
      if (path.basename(file) === 'ai.jsonl' && shippedIds.size > 0) {
        if (shippedIds.has(r.id)) {
          if (!keepShippedIds.has(r.id)) {
            drop.push(r);
            continue;
          }
        } else {
          const sid = r.provenance?.sectionId || `${c.file}#${c.anchor}`;
          const n = (secCount.get(sid) ?? 0) + 1;
          secCount.set(sid, n);
          if (n > PER_SECTION_CAP) {
            drop.push(r);
            continue;
          }
        }
      }
      keep.push(r);
    }
    log('prune-scope', `${path.basename(file)}: keep ${keep.length}, drop ${drop.length}`);
    if (keep.length !== rows.length) {
      const sample = drop.slice(0, 5).map((r) => r.citations?.[0]?.file ?? '(none)');
      log('prune-scope', `  dropped e.g. ${[...new Set(sample)].join(', ')}`);
    }
    if (WRITE && drop.length) await writeJsonl(file, keep);
  }
  if (!WRITE) log('prune-scope', 'dry run; pass --write to apply');
}

await main();
