import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app', 'js');

/**
 * A module that uses a name it never imported is a runtime ReferenceError, and
 * `node --check` cannot see it: the syntax is valid. That is exactly how
 * `attachmentBlocks` shipped — used in three modules, imported in none, and the
 * practice screen threw on first render while every check passed.
 *
 * This test compares the identifiers each module uses against the identifiers it
 * imports from its own siblings.
 */
/**
 * Remove comments and string literals before scanning for identifiers.
 *
 * Without this, prose matches: `Quarantined questions (${n})` inside a template
 * literal reads as a call to `questions()`, and a comment mentioning a helper
 * reads as a use of it.
 */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

/** Names declared in this file, whether exported or not. */
function localNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^\s*(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  return names;
}

async function exportsOf(file) {
  const src = await readFile(path.join(APP, file), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  return names;
}

test('every module imports the sibling helpers it uses', async () => {
  const files = (await readdir(APP)).filter((f) => f.endsWith('.js'));

  const siblingExports = new Map();
  for (const f of files) siblingExports.set(`./${f}`, await exportsOf(f));

  const problems = [];

  for (const f of files) {
    const src = await readFile(path.join(APP, f), 'utf8');
    // A module may use its own declarations freely; only siblings must be
    // imported.
    const own = new Set([...(await exportsOf(f)), ...localNames(src)]);
    const code = codeOnly(src);

    // Collect the names this module imports, per source.
    const imported = new Set();
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0];
        if (name) imported.add(name);
      }
    }

    // Any exported sibling helper used as a call or a bare reference must be
    // imported in this module.
    for (const [specifier, names] of siblingExports) {
      if (specifier === `./${f}`) continue;
      for (const name of names) {
        if (imported.has(name) || own.has(name)) continue;
        // `obj.name(` is property access and must not count, but `...name(`
        // is a spread of the identifier and must. The original bug shipped in
        // a spread, so this distinction is the difference between a test that
        // catches it and one that does not.
        const used = new RegExp(`(^|[^.\\w$]|\\.\\.\\.)${name}\\s*\\(`, 'm').test(code);
        if (used) problems.push(`${f}: uses ${name}() but does not import it`);
      }
    }
  }

  assert.deepEqual(problems, [], `unimported sibling helpers:\n${problems.join('\n')}`);
});

test('ui.js exports the helpers the screens rely on', async () => {
  const names = await exportsOf('ui.js');
  for (const expected of ['el', 'fill', 'richText', 'citationBlock', 'attachmentBlock', 'attachmentBlocks', 'difficultyBadge', 'optionButton', 'toast']) {
    assert.ok(names.has(expected), `ui.js should export ${expected}`);
  }
});
