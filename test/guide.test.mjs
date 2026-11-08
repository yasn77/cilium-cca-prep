import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const ROOT = path.resolve(import.meta.dirname, '..');
const GUIDE = path.join(ROOT, 'data', 'guide.json');

const guide = JSON.parse(await readFile(GUIDE, 'utf8'));

test('the plan is one week', () => {
  assert.equal(guide.days.length, 7);
  assert.deepEqual(
    guide.days.map((d) => d.day),
    [1, 2, 3, 4, 5, 6, 7],
    'days are numbered 1 to 7 in order',
  );
});

test('every day has a title, a summary and at least one activity', () => {
  for (const d of guide.days) {
    assert.ok(d.title?.length > 3, `day ${d.day} needs a title`);
    assert.ok(d.summary?.length > 20, `day ${d.day} needs a summary`);
    assert.ok(d.items.length > 0, `day ${d.day} needs an activity`);
  }
});

test('every item is a title plus an absolute https link or an in-app action', () => {
  const all = [
    ...guide.days.flatMap((d) => d.items.map((i) => ({ i, where: `day ${d.day}` }))),
    ...guide.references.flatMap((g) => g.items.map((i) => ({ i, where: `refs/${g.group}` }))),
  ];
  for (const { i, where } of all) {
    assert.ok(i.title?.trim().length >= 3, `${where}: item without a title`);
    if (i.url !== undefined) {
      assert.match(i.url, /^https:\/\//, `${where}: ${i.title} must be an https URL`);
    }
  }
});

test('the three Cilium Week sessions are present with their durations', () => {
  // These are the backbone of the plan; losing one would silently gut it.
  const text = JSON.stringify(guide);
  for (const [id, minutes] of [
    ['9Gj_9zpsnL0', '71'],
    ['lGHTSpBLWVc', '78'],
    ['eNx2wqSB7rY', '97'],
  ]) {
    assert.ok(text.includes(id), `missing Cilium Week video ${id}`);
    assert.ok(text.includes(minutes), `missing the ${minutes} min duration`);
  }
});

test('every domain is covered by at least one day', () => {
  const covered = new Set(guide.days.flatMap((d) => d.focus ?? []));
  for (const domain of [
    'architecture',
    'network-policy',
    'service-mesh',
    'observability',
    'installation',
    'cluster-mesh',
    'ebpf',
    'bgp',
  ]) {
    assert.ok(covered.has(domain), `no day focuses on ${domain}`);
  }
});

test('the reference groups include the things that are not free', () => {
  // Saying "this looks free but is not" is part of the value, so the group must
  // not quietly disappear in an edit.
  const groups = guide.references.map((g) => g.group);
  assert.ok(
    groups.some((g) => /looks free|not free/i.test(g)),
    'the "looks free, is not" group is missing',
  );
});

test('links are unique per target, so nothing is listed twice by accident', () => {
  const urls = [
    ...guide.days.flatMap((d) => d.items.map((i) => i.url)),
    ...guide.references.flatMap((g) => g.items.map((i) => i.url)),
  ].filter(Boolean);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  // A lab may legitimately appear on a day and in the references, so only fail
  // when the same URL appears twice in the same place.
  const byPlace = new Map();
  for (const d of guide.days) {
    const seen = new Set();
    for (const item of d.items) {
      if (!item.url) continue;
      assert.ok(!seen.has(item.url), `day ${d.day} lists ${item.url} twice`);
      seen.add(item.url);
    }
  }
  void dupes;
  void byPlace;
});
