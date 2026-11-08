import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

// Import the pure helpers under test. The scripts under tools/ are run as
// programs, so the logic they expose is re-implemented nowhere: these imports
// exercise the same functions the pipeline calls.

const { quotePresent, similarity, stableId, citationUrl, tokenise } = await import(
  path.join(ROOT, 'tools', 'lib.mjs')
);
const { extractJson } = await import(path.join(ROOT, 'tools', 'llm.mjs'));
const { parseExam } = await import(path.join(ROOT, 'tools', 'blind-set.mjs'));

test('stableId depends on file, anchor and ordinal only', () => {
  const a = stableId('a.rst', 'x', 0);
  const b = stableId('a.rst', 'x', 0);
  const c = stableId('a.rst', 'x', 1);
  const d = stableId('b.rst', 'x', 0);
  assert.equal(a, b, 'same inputs produce the same id');
  assert.notEqual(a, c, 'ordinal changes the id');
  assert.notEqual(a, d, 'file changes the id');
  assert.match(a, /^[0-9a-f]{16}$/);
});

test('stableId is not derived from question text', () => {
  // This is the property that keeps learner progress across regeneration:
  // rewording a question must not change its identity.
  const before = stableId('f.rst', 'anchor', 2);
  const after = stableId('f.rst', 'anchor', 2);
  assert.equal(before, after);
});

test('citationUrl builds a docs.cilium.io anchor link', () => {
  assert.equal(
    citationUrl('network/ebpf/maps.rst', 'bpf-map-limitations'),
    'https://docs.cilium.io/en/stable/network/ebpf/maps/#bpf-map-limitations',
  );
});

test('quotePresent tolerates whitespace and quote-mark differences', () => {
  const source = 'The agent can be put into the following three policy enforcement modes.';
  assert.ok(quotePresent('the agent can be put into the following three policy enforcement modes', source));
  assert.ok(quotePresent('  the   agent can be put into the following three policy enforcement modes.  ', source));
  assert.ok(!quotePresent('the agent can be put into four modes', source));
});

test('quotePresent normalises smart quotes', () => {
  const source = 'It says \u201capply the policy\u201d in the docs.';
  assert.ok(quotePresent('"It says "apply the policy" in the docs."'.slice(1, -1), source));
});

test('similarity catches reworded duplicates and separates distinct questions', () => {
  const a = 'Which component enforces Cilium network policy on each node in the cluster';
  const b = 'Which component enforces Cilium network policy on each cluster node';
  const c = 'What is the default policy enforcement mode for a newly selected endpoint';
  assert.ok(similarity(a, b) > 0.7, 'near-identical wording scores high');
  assert.ok(similarity(a, c) < 0.3, 'different questions score low');
});

test('tokenise drops short words and punctuation', () => {
  const tokens = tokenise('The **Cilium** agent, on each node!');
  assert.ok(tokens.includes('cilium'));
  assert.ok(tokens.includes('agent'));
  assert.ok(!tokens.includes('on'), 'two-letter words are dropped');
});

test('extractJson survives fences and surrounding prose', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('Here you go:\n```json\n{"a":1}\n```\nHope that helps.'), { a: 1 });
  assert.deepEqual(extractJson('Result: [{"a":1},{"b":2}] done'), [{ a: 1 }, { b: 2 }]);
  assert.equal(extractJson('no json here'), null);
});

test('extractJson handles braces inside strings', () => {
  const text = '{"stem":"What is {this}?","answer":"a"}';
  assert.deepEqual(extractJson(text), { stem: 'What is {this}?', answer: 'a' });
});

test('extractJson returns null rather than throwing on truncated output', () => {
  assert.equal(extractJson('{"questions":[{"stem":"half'), null);
});

const SAMPLE_EXAM = `
## **Section 1: Architecture (20%)**

1. **Which component enforces policy on each node?**
   - [ ] **A)** Cilium Operator
   - [ ] **B)** Cilium Agent
   - [ ] **C)** Hubble Relay
   - [ ] **D)** The CLI

2. **What does IPAM stand for?**
   - [ ] **A)** IP address management
   - [ ] **B)** Internet protocol access mode
   - [ ] **C)** Inter-pod address mapping
   - [ ] **D)** Internal packet arbitration

## **Answer Key and Explanations**

1. **B) Cilium Agent**
   *Explanation:* The agent runs on each node.

2. **A) IP address management**
   *Explanation:* It manages pod IPs.
`;

test('parseExam pairs questions with the answer key', () => {
  const parsed = parseExam(SAMPLE_EXAM);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].answer, 'b');
  assert.equal(parsed[1].answer, 'a');
  assert.equal(parsed[0].options.length, 4);
  assert.match(parsed[0].stem, /Which component enforces policy/);
});

test('parseExam refuses a document with no answer key', () => {
  assert.throws(() => parseExam('1. **A question?**\n - [ ] **A)** x'), /answer key/);
});


// --- entailment -------------------------------------------------------------

const { checkEntailment } = await import(path.join(ROOT, 'tools', 'entailment.mjs'));

const SOURCE = {
  text: 'The socket operations hook attaches to socket system calls and can enforce policy for connected sockets. It is the earliest point at which a connection can be allowed or denied in the datapath for that specific use.',
};

function q(options, answer) {
  return { options: options.map((text, i) => ({ id: 'abcde'[i], text })), answer };
}

test('a one-word answer present in the citation is accepted', () => {
  // Rejecting these as "answer-too-short" emptied the eBPF domain, where most
  // correct answers are single terms.
  const result = checkEntailment(
    q(['socket', 'a userspace proxy in the host namespace', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    SOURCE,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('a one-word answer absent from the citation is rejected', () => {
  const result = checkEntailment(
    q(['geneve', 'a userspace proxy in the host namespace', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    SOURCE,
  );
  assert.equal(result.reason, 'answer-not-in-citation');
});

test('a short answer only matched as a substring is rejected', () => {
  const source = { text: 'The mapping table is populated by the agent and reflects every endpoint identity that exists.' };
  const result = checkEntailment(
    q(['map', 'a userspace proxy in the host namespace', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    source,
  );
  assert.equal(result.reason, 'answer-not-in-citation', '"map" must not be satisfied by "mapping"');
});

test('a short answer contained in a distractor is rejected', () => {
  const result = checkEntailment(
    q(['socket', 'a socket operations hook in the host', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    SOURCE,
  );
  assert.equal(result.reason, 'answer-appears-in-distractor');
});

test('a long answer sharing most of its words with the citation is accepted', () => {
  const result = checkEntailment(
    q([ 'The socket operations hook attaches to socket system calls and enforces policy', 'a userspace proxy in the host namespace', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    SOURCE,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('a long answer sharing little with the citation is rejected', () => {
  const result = checkEntailment(
    q(['Packets are duplicated across every node in the cluster by the operator', 'a userspace proxy in the host namespace', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    SOURCE,
  );
  assert.match(result.reason, /^answer-not-in-citation/);
});

test('a passage that discusses several options still supports a question', () => {
  // A page listing the three enforcement modes contains the vocabulary of all
  // three. Rejecting that as "all options in citation" threw away good
  // questions about exactly those pages, which is where the exam focuses.
  const source = {
    text: 'The agent can be put into the following three policy enforcement modes: default, where endpoints are unrestricted until selected by policy; always, where enforcement is enabled on all endpoints even if no rules select them; and never, where enforcement is disabled on all endpoints even if rules do select them.',
  };
  const result = checkEntailment(
    q(['always', 'a userspace proxy in the host namespace', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    source,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('the answer still has to be supported by the citation', () => {
  const source = {
    text: 'The agent can be put into the following three policy enforcement modes: default, always and never.',
  };
  const result = checkEntailment(
    q(['a gossip protocol between agents', 'a userspace proxy in the host namespace', 'the cloud load balancer health probe', 'an ingress qdisc filter'], 'a'),
    source,
  );
  assert.match(result.reason, /^answer-not-in-citation/);
});
