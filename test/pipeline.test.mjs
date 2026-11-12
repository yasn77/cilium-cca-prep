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

// --- judge verdict merging ----------------------------------------------

const { mergeVerdicts, judgeSource } = await import(path.join(ROOT, 'tools', 'verdicts.mjs'));

test('an error verdict never displaces a real defect', () => {
  // This regression let 134 questions ship that SystemOne had rejected: the
  // adversarial judge's infrastructure error overwrote its verdict.
  const merged = mergeVerdicts(
    { q1: { choice: 'trivia_not_in_blueprint', confidence: 0.9 } },
    { q1: { choice: 'error', detail: 'no verdict returned for this key' } },
  );
  assert.equal(merged.q1.choice, 'trivia_not_in_blueprint');
});

test('an error verdict never counts as approval', () => {
  const merged = mergeVerdicts({}, { q1: { choice: 'error' } });
  assert.equal(merged.q1.choice, 'error');
});

test('a real verdict from either judge stands alone', () => {
  const merged = mergeVerdicts(
    { q1: { choice: 'good_exam_item' } },
    { q1: { choice: 'error' }, q2: { choice: 'good_exam_item' } },
  );
  assert.equal(merged.q1.choice, 'good_exam_item');
  assert.equal(merged.q2.choice, 'good_exam_item');
});

test('when both judges give a real verdict the stricter one wins', () => {
  const merged = mergeVerdicts(
    { q1: { choice: 'good_exam_item', difficulty: 2.8 } },
    { q1: { choice: 'ambiguity_two_correct' } },
  );
  assert.equal(merged.q1.choice, 'ambiguity_two_correct');
  assert.equal(merged.q1.difficulty, 2.8);
  assert.deepEqual(merged.q1.also, ['good_exam_item']);
});

test('judgeSource reports which judges contributed', () => {
  assert.equal(judgeSource({ q1: {} }, {}), 'systemone');
  assert.equal(judgeSource({}, { q1: {} }), 'adversarial');
  assert.equal(judgeSource({ q1: {} }, { q1: {} }), 'systemone+adversarial');
  assert.equal(judgeSource({}, {}), null);
});

// --- self-contained wording -------------------------------------------------

const { checkWording, checkOptionWording } = await import(path.join(ROOT, 'tools', 'wording.mjs'));

test('a question that refers to the policy without showing it is rejected', () => {
  // The exact question that exposed this: it passes both quality judges, and is
  // still unanswerable, because the reader never sees the policy it names.
  const stem =
    'After the L7 policy is in place, an engineer runs `kubectl exec xwing -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing` and receives no response. Why?';
  assert.match(checkWording(stem), /^unbound-reference:/);
});

test('the same question is fine once the policy is restated', () => {
  const stem =
    'A CiliumNetworkPolicy selects pods labelled app=deathstar and permits only POST /v1/request-landing on port 80 from pods labelled org=empire. A pod labelled app=xwing sends a POST to /v1/request-landing. Why does the connection time out?';
  assert.equal(checkWording(stem), null);
});

test('referring to the excerpt is rejected', () => {
  assert.equal(checkWording('Which command does the excerpt present for verifying that BBR is enabled?'), 'meta-reference-to-source');
  assert.equal(checkWording('According to the excerpt, what does the agent do?'), 'meta-reference-to-source');
  assert.equal(checkWording('Which statement is supported by the passage?'), 'meta-reference-to-source');
});

test('referring to output the reader cannot see is rejected', () => {
  assert.equal(checkWording('According to the verbose output, what is the NodePort range?'), 'meta-reference-to-source');
});

test('a definite reference is accepted when the stem shows the object', () => {
  const withYaml = [
    'Given this policy, what happens to egress traffic?',
    '```yaml',
    'apiVersion: cilium.io/v2',
    'kind: CiliumNetworkPolicy',
    '```',
  ].join('\n');
  assert.equal(checkWording(withYaml), null);
});

test('ordinary questions pass', () => {
  const stems = [
    'Which component of Cilium enforces network policy on each node?',
    'A cluster administrator enables the bandwidth manager on a multi-node cluster. Which Helm option sets the devices?',
    'What is the default policy enforcement mode for an endpoint no policy selects?',
  ];
  for (const s of stems) assert.equal(checkWording(s), null, s);
});

test('a distractor carrying an unbound reference is caught too', () => {
  const options = [
    { id: 'a', text: 'The agent restarts' },
    { id: 'b', text: 'The above manifest is rejected' },
    { id: 'c', text: 'Nothing changes' },
    { id: 'd', text: 'Traffic is dropped' },
  ];
  assert.match(checkOptionWording(options), /option-unbound-reference:b/);
});

// --- attachments -----------------------------------------------------------

const { checkAttachments } = await import(path.join(ROOT, 'tools', 'attachments.mjs'));

const POLICY_SECTION = {
  text: [
    'Here is an example policy file that extends our original policy.',
    '```yaml',
    'apiVersion: "cilium.io/v2"',
    'kind: CiliumNetworkPolicy',
    'metadata:',
    '  name: "rule1"',
    'spec:',
    '  endpointSelector:',
    '    matchLabels:',
    '      org: empire',
    '```',
  ].join('\n'),
};

test('a manifest that appears in the citation is accepted', () => {
  const q = {
    attachments: [
      {
        kind: 'manifest',
        title: 'The policy under test',
        language: 'yaml',
        body: 'apiVersion: "cilium.io/v2"\nkind: CiliumNetworkPolicy\nmetadata:\n  name: "rule1"',
      },
    ],
  };
  assert.equal(checkAttachments(q, POLICY_SECTION), null);
});

test('an invented manifest is rejected', () => {
  const q = {
    attachments: [
      {
        kind: 'manifest',
        title: 'The policy under test',
        language: 'yaml',
        body: 'apiVersion: "cilium.io/v2"\nkind: CiliumNetworkPolicy\nmetadata:\n  name: "rule2"',
      },
    ],
  };
  assert.match(checkAttachments(q, POLICY_SECTION), /not in cited section/);
});

test('a question with no attachments is fine', () => {
  assert.equal(checkAttachments({}, POLICY_SECTION), null);
});

test('a diagram is accepted on its declaration alone', () => {
  const q = { attachments: [{ kind: 'diagram', title: 'The datapath' }] };
  assert.equal(checkAttachments(q, POLICY_SECTION), null);
});

test('a malformed attachment is rejected', () => {
  assert.match(checkAttachments({ attachments: [{ kind: 'nonsense', title: 'x' }] }, POLICY_SECTION), /bad kind/);
  assert.match(
    checkAttachments({ attachments: [{ kind: 'manifest', title: 'The policy', body: '' }] }, POLICY_SECTION),
    /body too short/,
  );
  assert.match(checkAttachments({ attachments: 'nope' }, POLICY_SECTION), /not-array/);
});

test('an attachment lets the stem refer to the policy it shows', () => {
  // This is the reported question's shape, done correctly: the policy is shown,
  // so "this policy" is bound by the attachment rather than the stem.
  const stem = 'After this policy is applied, a pod labelled app=xwing sends POST /v1/request-landing and gets no response. Why?';
  assert.match(checkWording(stem), /^unbound-reference:/, 'without an attachment it is rejected');
  assert.equal(checkWording(stem, { hasAttachment: true }), null, 'with an attachment it is fine');
});
