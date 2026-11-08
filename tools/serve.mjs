#!/usr/bin/env node
/**
 * Local static server for the app, mirroring how GitHub Pages serves it.
 *
 * The app fetches `data/*.json` relative to `app/`, which in the repository is a
 * sibling directory. Pages gets them copied in by the workflow; locally this
 * server maps /data/ to ../data/ so the same code path works both ways.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');
const DATA = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function resolveTarget(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  if (clean.startsWith('/data/')) return path.join(DATA, clean.slice('/data/'.length));
  if (clean === '/' || clean === '') return path.join(APP, 'index.html');
  return path.join(APP, clean);
}

const server = createServer(async (req, res) => {
  let target = resolveTarget(req.url ?? '/');
  try {
    const info = await stat(target).catch(() => null);
    if (!info || info.isDirectory()) target = path.join(APP, 'index.html');
    if (!target.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

server.listen(PORT, () => {
  process.stdout.write(`serving http://localhost:${PORT}/\n`);
});
