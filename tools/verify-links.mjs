/**
 * Check the study guide's links against the live web.
 *
 * `data/guide.json` promises, in its notice, that every link was checked for
 * status and, where it is a lab, title on the date recorded there. Nothing in
 * the repo enforces that promise: the unit tests validate structure only, so a
 * retired lab or a renamed one drifts silently until someone rechecks by hand.
 * This is that recheck, as a command.
 *
 * Usage:
 *   node tools/verify-links.mjs                  status of every URL
 *   node tools/verify-links.mjs --titles         status plus lab-title comparison
 *   node tools/verify-links.mjs --titles --strict
 *
 * A non-2xx response or a network error always fails. A title mismatch fails
 * only with --strict, so the default run is safe in a noisy network.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GUIDE = path.join(ROOT, 'data', 'guide.json');

const args = new Set(process.argv.slice(2));
const CHECK_TITLES = args.has('--titles');
const STRICT = args.has('--strict');
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 4;
const GAP_MS = 250;

const guide = JSON.parse(await readFile(GUIDE, 'utf8'));

/** Every URL in the guide, deduplicated, with the titles it is listed under. */
function collect() {
  const map = new Map();
  const add = (item, place) => {
    if (!item?.url) return;
    const entry = map.get(item.url) ?? { titles: new Set(), places: [] };
    entry.titles.add(item.title);
    entry.places.push(place);
    map.set(item.url, entry);
  };
  for (const day of guide.days) for (const item of day.items) add(item, `day ${day.day}`);
  for (const group of guide.references) for (const item of group.items) add(item, `refs/${group.group}`);
  return [...map.entries()];
}

function isLabUrl(url) {
  // The catalogue index is a lab-looking URL with no single lab title.
  return /^https:\/\/isovalent\.com\/labs\/[^/]+\/$/.test(url) && url !== 'https://isovalent.com/labs/';
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function pageTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return decodeEntities(match[1]).replace(/\s+/g, ' ').trim();
}

/** Isovalent appends " | Isovalent Labs" to its lab page titles. */
function bareTitle(title) {
  return title.split('|')[0].trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkOne(url, meta) {
  if (!url.startsWith('https://')) {
    return { url, ok: false, error: 'not an https URL' };
  }

  let response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'cilium-cca-prep link check' },
    });
  } catch (error) {
    const name = error?.name === 'TimeoutError' ? 'timed out' : String(error?.message ?? error);
    return { url, ok: false, error: name };
  }

  const body = await response.text();
  const result = {
    url,
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    moved: response.url && response.url !== url ? response.url : null,
  };

  if (CHECK_TITLES && isLabUrl(url)) {
    const title = pageTitle(body);
    result.siteTitle = title;
    result.wanted = [...meta.titles];
    result.titleOk = title !== null && [...meta.titles].every((wanted) => wanted === title || wanted === bareTitle(title));
  }

  return result;
}

async function checkAll(entries) {
  const results = new Array(entries.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      const [url, meta] = entries[index];
      results[index] = await checkOne(url, meta);
      await sleep(GAP_MS);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

const entries = collect();
console.log(`verify-links: ${entries.length} URLs from data/guide.json${CHECK_TITLES ? ' (lab titles checked)' : ''}\n`);

const results = await checkAll(entries);
const statusFailures = [];
const titleFailures = [];

for (const result of results) {
  if (!result.ok) statusFailures.push(result);
  if (result.titleOk === false) titleFailures.push(result);

  if (result.error) {
    console.log(`fail   ${result.url}  ${result.error}`);
    continue;
  }

  const status = String(result.status).padEnd(4);
  const moved = result.moved ? `  -> ${result.moved}` : '';
  if (!result.ok) {
    console.log(`fail   ${status} ${result.url}${moved}`);
  } else if (result.titleOk === undefined) {
    console.log(`ok     ${status} ${result.url}${moved}`);
  } else if (result.titleOk) {
    console.log(`title  ${status} ${result.url}${moved}  "${bareTitle(result.siteTitle)}"`);
  } else {
    const wanted = result.wanted ?? [];
    const got = result.siteTitle === null ? '(no <title>)' : bareTitle(result.siteTitle);
    console.log(`TITLE  ${status} ${result.url}${moved}`);
    console.log(`       wanted "${wanted.join('" / "')}" but found "${got}"`);
  }
}

const failed = statusFailures.length + (STRICT ? titleFailures.length : 0);
console.log(`\n${results.length} checked, ${statusFailures.length} status failure(s), ${titleFailures.length} title mismatch(es)`);
process.exit(failed === 0 ? 0 : 1);
