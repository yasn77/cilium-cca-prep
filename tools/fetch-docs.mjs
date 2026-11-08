#!/usr/bin/env node
/**
 * Fetch the pinned Cilium documentation into corpus/docs/.
 *
 * Primary route: the GitHub tarball for the pinned tag, filtered to .rst files
 * under Documentation/. One request, exact bytes, and a commit SHA we can
 * record as provenance.
 *
 * Fallback route: per-file requests to the Read the Docs _sources endpoint.
 * Used when the API is rate-limited or the tarball is unreachable. A run that
 * mixes routes still works, but records which route produced each file so a
 * corpus built two different ways is visible rather than assumed identical.
 */
import { createWriteStream } from 'node:fs';
import { mkdir, rm, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { docs, includePaths, excludePaths } from '../tools/config.mjs';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_DIR = path.join(ROOT, 'corpus', 'docs');
const SOURCES = path.join(ROOT, 'data', 'sources.json');
const TMP = path.join(ROOT, 'tmp');

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');

function log(msg) {
  process.stdout.write(`[fetch-docs] ${msg}\n`);
}

function inScope(rel) {
  if (!rel.endsWith('.rst')) return false;
  if (excludePaths.some((re) => re.test(rel))) return false;
  return includePaths.some((re) => re.test(rel));
}

async function readSources() {
  try {
    return JSON.parse(await readFile(SOURCES, 'utf8'));
  } catch {
    return null;
  }
}

async function resolveSha() {
  const res = await fetch(
    `https://api.github.com/repos/${docs.repo}/git/ref/tags/${docs.ref}`,
    { headers: { accept: 'application/vnd.github+json' } },
  );
  if (!res.ok) throw new Error(`cannot resolve ${docs.ref}: HTTP ${res.status}`);
  const ref = await res.json();
  // An annotated tag points at a tag object; peel it to the commit.
  if (ref.object?.type === 'tag') {
    const tagRes = await fetch(
      `https://api.github.com/repos/${docs.repo}/git/tags/${ref.object.sha}`,
      { headers: { accept: 'application/vnd.github+json' } },
    );
    if (!tagRes.ok) throw new Error(`cannot peel tag: HTTP ${tagRes.status}`);
    const tag = await tagRes.json();
    return tag.object.sha;
  }
  return ref.object.sha;
}

async function fetchViaTarball() {
  await mkdir(TMP, { recursive: true });
  const archive = path.join(TMP, 'cilium-docs.tar.gz');
  log(`downloading tarball for ${docs.ref}`);
  const res = await fetch(
    `https://api.github.com/repos/${docs.repo}/tarball/${docs.ref}`,
    { headers: { accept: 'application/vnd.github+json' } },
  );
  if (!res.ok) throw new Error(`tarball: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(archive));

  const extractDir = path.join(TMP, 'cilium-docs');
  await rm(extractDir, { recursive: true, force: true });
  await mkdir(extractDir, { recursive: true });
  log('extracting Documentation/**/*.rst');
  await execFileAsync('tar', [
    '-xzf',
    archive,
    '-C',
    extractDir,
    '--wildcards',
    '*/Documentation/*.rst',
  ]);

  const [top] = await readdir(extractDir);
  const docRoot = path.join(extractDir, top, 'Documentation');
  await rm(DOCS_DIR, { recursive: true, force: true });
  await mkdir(DOCS_DIR, { recursive: true });

  const written = [];
  async function walk(dir, prefix) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), rel);
      } else if (inScope(rel)) {
        const dest = path.join(DOCS_DIR, rel);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, await readFile(path.join(dir, entry.name)));
        written.push(rel);
      }
    }
  }
  await walk(docRoot, '');
  return { written, route: 'tarball' };
}

async function fetchViaSources(rstList) {
  // The fallback has no directory listing, so it can only re-fetch the set a
  // previous tarball run recorded. Without that, there is nothing to ask for.
  if (!rstList?.length) {
    throw new Error('no file list available for the _sources fallback');
  }
  await rm(DOCS_DIR, { recursive: true, force: true });
  await mkdir(DOCS_DIR, { recursive: true });
  const written = [];
  for (const rel of rstList) {
    const url = `${docs.fallbackBase}/${rel}.txt`;
    const res = await fetch(url);
    if (!res.ok) {
      log(`skip ${rel}: HTTP ${res.status}`);
      continue;
    }
    const dest = path.join(DOCS_DIR, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, await res.text());
    written.push(rel);
  }
  return { written, route: 'rtd-sources' };
}

async function dirStats() {
  let files = 0;
  let bytes = 0;
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else {
        files += 1;
        bytes += (await stat(p)).size;
      }
    }
  }
  await walk(DOCS_DIR);
  return { files, bytes };
}

async function main() {
  const previous = await readSources();

  if (!FORCE && previous?.docs?.ref === docs.ref && previous?.docs?.route === 'tarball') {
    const { files, bytes } = await dirStats();
    if (files > 0) {
      log(`docs up to date (${files} files, ${bytes} bytes at ${docs.ref})`);
      return;
    }
  }

  let sha = null;
  try {
    sha = await resolveSha();
    log(`resolved ${docs.ref} to ${sha}`);
  } catch (err) {
    log(`warning: ${err.message}; continuing without a resolved SHA`);
  }

  let result;
  try {
    result = await fetchViaTarball();
  } catch (err) {
    log(`tarball route failed (${err.message}); trying the _sources fallback`);
    result = await fetchViaSources(previous?.docs?.files);
  }

  const { files, bytes } = await dirStats();
  const manifest = {
    docs: {
      repo: docs.repo,
      ref: docs.ref,
      sha,
      route: result.route,
      fetched_at: new Date().toISOString(),
      file_count: files,
      byte_count: bytes,
      files: result.written.sort(),
    },
  };
  await mkdir(path.dirname(SOURCES), { recursive: true });
  await writeFile(SOURCES, `${JSON.stringify(manifest, null, 2)}\n`);

  log(`wrote ${result.written.length} rst files (${bytes} bytes) via ${result.route}`);
  await rm(path.join(TMP, 'cilium-docs.tar.gz'), { force: true });
  await rm(path.join(TMP, 'cilium-docs'), { recursive: true, force: true });
}

await main();
