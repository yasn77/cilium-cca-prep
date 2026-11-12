import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

// The app modules use browser APIs at import time only inside functions, so the
// pure ones can be imported directly with a minimal localStorage shim.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const data = await import(path.join(ROOT, 'app', 'js', 'data.js'));

function makeQuestion(id, domain, answer = 'a') {
  return {
    id,
    domain,
    answer,
    options: [
      { id: 'a', text: 'a' },
      { id: 'b', text: 'b' },
      { id: 'c', text: 'c' },
      { id: 'd', text: 'd' },
    ],
  };
}

test('buildExamPaper returns the requested size', () => {
  const pool = [];
  for (const d of data.DOMAIN_ORDER) {
    for (let i = 0; i < 40; i += 1) pool.push(makeQuestion(`${d}-${i}`, d));
  }
  const { paper } = data.buildExamPaper(pool, 60);
  assert.equal(paper.length, 60);
  assert.equal(new Set(paper.map((q) => q.id)).size, 60, 'no duplicate questions');
});

test('buildExamPaper follows the official weights when the pool allows it', () => {
  const pool = [];
  for (const d of data.DOMAIN_ORDER) {
    for (let i = 0; i < 50; i += 1) pool.push(makeQuestion(`${d}-${i}`, d));
  }
  const { paper } = data.buildExamPaper(pool, 60);
  const counts = {};
  for (const q of paper) counts[q.domain] = (counts[q.domain] ?? 0) + 1;
  // 20/18/16/10/10/10/10/6 of 60 rounds to 12/11/10/6/6/6/6/3.
  assert.equal(counts.architecture, 12);
  assert.equal(counts['network-policy'], 11);
  assert.equal(counts['service-mesh'], 10);
  assert.equal(counts.bgp, 3);
});

test('buildExamPaper reports a shortfall instead of silently shrinking', () => {
  const pool = [makeQuestion('a1', 'architecture'), makeQuestion('b1', 'bgp')];
  const { paper, shortfall } = data.buildExamPaper(pool, 60);
  assert.equal(paper.length, 2);
  assert.ok(Object.keys(shortfall).length > 0, 'shortfall is reported');
});

test('domainBreakdown scores each domain separately', () => {
  const paper = [
    makeQuestion('x1', 'architecture', 'a'),
    makeQuestion('x2', 'architecture', 'a'),
    makeQuestion('x3', 'bgp', 'a'),
  ];
  const breakdown = data.domainBreakdown({ x1: 'a', x2: 'b', x3: 'a' }, paper);
  assert.equal(breakdown.architecture.right, 1);
  assert.equal(breakdown.architecture.total, 2);
  assert.equal(breakdown.architecture.pct, 50);
  assert.equal(breakdown.bgp.pct, 100);
});

test('displayBlindSet normalises numeric and string answers to letters', () => {
  const state = data.getState();
  state.blind = {
    questions: [
      { id: 'q1', stem: 'x', options: ['one', 'two', 'three', 'four'], answer: 2 },
      { id: 'q2', stem: 'y', options: [{ id: 'a', text: 'one' }], answer: 'a' },
    ],
  };
  const [one, two] = data.displayBlindSet();
  assert.equal(one.answer, 'c');
  assert.equal(one.options[0].id, 'a');
  assert.equal(two.answer, 'a');
});

// --- difficulty ------------------------------------------------------------

test('a question without a scored difficulty is treated as the real exam', () => {
  // A partial judging run must not empty the app, so unscored means 3.0.
  assert.equal(data.difficultyOf({}), 3);
  assert.equal(data.difficultyOf({ difficulty: 4.2 }), 4.2);
});

test('difficultyBand returns questions near the target', () => {
  const pool = [
    { id: 'a', domain: 'ebpf', difficulty: 1.2 },
    { id: 'b', domain: 'ebpf', difficulty: 2.9 },
    { id: 'c', domain: 'ebpf', difficulty: 3.1 },
    { id: 'd', domain: 'ebpf', difficulty: 4.8 },
  ];
  const mid = data.difficultyBand(pool, 3, { minimum: 1 }).map((q) => q.id);
  assert.ok(mid.includes('b') && mid.includes('c'));
  assert.ok(!mid.includes('d'), '4.8 is outside the default band around 3');
  const hard = data.difficultyBand(pool, 5, { minimum: 1 }).map((q) => q.id);
  assert.ok(hard.includes('d'));
});

test('difficultyBand widens rather than returning an empty queue', () => {
  const pool = [{ id: 'a', domain: 'ebpf', difficulty: 5 }, { id: 'b', domain: 'ebpf', difficulty: 4.9 }];
  const picked = data.difficultyBand(pool, 1, { minimum: 2 });
  assert.equal(picked.length, 2, 'widened until the minimum was met');
});

test('the middle of the slider is the real exam', () => {
  assert.match(data.difficultyTier(3).label, /real cca exam/i);
  assert.match(data.difficultyTier(1.5).label, /warm-up/i);
  assert.match(data.difficultyTier(4.8).label, /expert/i);
});

test('the exam paper honours a difficulty target but still fills', () => {
  const pool = [];
  for (const d of data.DOMAIN_ORDER) {
    for (let i = 0; i < 20; i += 1) {
      pool.push({ ...makeQuestion(`${d}-${i}`, d), difficulty: 1 + (i % 5) });
    }
  }
  const { paper } = data.buildExamPaper(pool, 60, 3);
  assert.equal(paper.length, 60);
  const mostly = paper.filter((q) => Math.abs(q.difficulty - 3) <= 2).length;
  assert.ok(mostly >= 55, `expected the paper to sit near the target, got ${mostly}/60`);
});
