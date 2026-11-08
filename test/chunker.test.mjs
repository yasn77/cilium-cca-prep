import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const ROOT = path.resolve(import.meta.dirname, '..');
const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');

// The chunker is a program, so the test runs it against a fixture rather than
// importing it. That also proves the fixture path works end to end.
const { spawnSync } = await import('node:child_process');
const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
const os = await import('node:os');

async function runChunkerOn(fixtureFiles) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'chunk-'));
  const docsDir = path.join(dir, 'corpus', 'docs');
  await mkdir(docsDir, { recursive: true });
  for (const [rel, body] of Object.entries(fixtureFiles)) {
    const p = path.join(docsDir, rel);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }
  // Run the real script with its output redirected by copying the repo layout.
  const toolsDir = path.join(dir, 'tools');
  await mkdir(toolsDir, { recursive: true });
  for (const f of ['chunk-rst.mjs', 'config.mjs']) {
    await writeFile(path.join(toolsDir, f), await readFile(path.join(ROOT, 'tools', f)));
  }
  const res = spawnSync(process.execPath, [path.join(toolsDir, 'chunk-rst.mjs')], { cwd: dir, encoding: 'utf8' });
  const out = JSON.parse(await readFile(path.join(dir, 'corpus', 'sections.json'), 'utf8'));
  await rm(dir, { recursive: true, force: true });
  return { res, out };
}

const LONG = 'This paragraph exists so the section passes the minimum length check for chunking. '.repeat(6);

test('chunker parses underline-style headings', async () => {
  const { out } = await runChunkerOn({
    'security/policy/intro.rst': `Policy Modes\n============\n\n${LONG}\n\nAlways Mode\n-----------\n\n${LONG}\n`,
  });
  assert.equal(out.sections.length, 2);
  assert.equal(out.sections[0].anchor, 'policy-modes');
  assert.equal(out.sections[1].anchor, 'always-mode');
});

test('chunker parses overline-style headings', async () => {
  // Several Cilium files use #### / Title / #### and were previously lost entirely.
  const { out } = await runChunkerOn({
    'network/ebpf/iptables.rst': `##############\nIptables Usage\n##############\n\n${LONG}\n`,
  });
  assert.equal(out.sections.length, 1);
  assert.equal(out.sections[0].title, 'Iptables Usage');
  assert.equal(out.sections[0].anchor, 'iptables-usage');
});

test('chunker slugs slashes into hyphens the way Sphinx does', async () => {
  const { out } = await runChunkerOn({
    'gettingstarted/demo.rst': `Star Wars Demo\n==============\n\n${LONG}\n\nApply an L3/L4 Policy\n--------------------\n\n${LONG}\n`,
  });
  assert.ok(out.sections.some((s) => s.anchor === 'apply-an-l3-l4-policy'), 'slash becomes a hyphen');
});

test('chunker numbers duplicate headings as id1, not with a suffix', async () => {
  const { out } = await runChunkerOn({
    'network/concepts/routing.rst': `Routing\n=======\n\n${LONG}\n\nConfiguration\n-------------\n\n${LONG}\n\nConfiguration\n-------------\n\n${LONG}\n`,
  });
  const anchors = out.sections.map((s) => s.anchor);
  assert.deepEqual(anchors, ['routing', 'configuration', 'id1']);
});

test('chunker maps domains and drops unmappable sections', async () => {
  const { out } = await runChunkerOn({
    'security/policy/intro.rst': `Policy\n======\n\n${LONG}\n`,
    'unknown/path/file.rst': `Something\n=========\n\n${LONG}\n`,
  });
  assert.equal(out.sections.length, 1);
  assert.equal(out.sections[0].domain, 'network-policy');
  assert.ok(out.counts.dropped.unmapped_domain >= 1);
});

test('the committed section index has only verified or unpublished anchors', async () => {
  const data = JSON.parse(await readFile(SECTIONS, 'utf8'));
  const unexpected = data.sections.filter(
    (s) => !['verified', 'unpublished', 'unmatched'].includes(s.renderStatus),
  );
  assert.equal(unexpected.length, 0);
  const verified = data.sections.filter((s) => s.renderStatus === 'verified');
  assert.ok(verified.length > 500, `expected a substantial verified section set, got ${verified.length}`);
});
