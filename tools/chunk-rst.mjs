#!/usr/bin/env node
/**
 * Split the pinned rst documentation into heading-anchored sections.
 *
 * Each section becomes both the unit a generator writes from and the unit a
 * question cites. The anchor has to match what Read the Docs renders as the
 * section's HTML id, otherwise the citation link in the app lands on the right
 * page but not the right place.
 *
 * Sphinx anchor rules implemented here:
 *   - an explicit `.. _label:` immediately above a heading wins, and the label
 *     itself becomes the id;
 *   - otherwise the heading text is slugged: lowercase, punctuation dropped,
 *     spaces to hyphens, repeated pushes through `-1`, `-2` (dedupe below);
 *   - duplicate slugs within one file are disambiguated in document order.
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  docs,
  chunking,
  domainRules,
  competencyRules,
  domains,
} from './config.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_DIR = path.join(ROOT, 'corpus', 'docs');
const OUT = path.join(ROOT, 'corpus', 'sections.json');

const ULINE = /^([=\-~^"'`#*+:])\1{2,}\s*$/;

/**
 * Sphinx's section-id generation, as verified against the rendered site on
 * 2026-11-07:
 *
 *   "Apply an L3/L4 Policy"            -> apply-an-l3-l4-policy   (/ becomes -)
 *   "eBPF-based"                       -> ebpf-based
 *   "Highly Available Cilium Operator" -> highly-available-cilium-operator
 *   "Kubernetes Network Policies versus Cilium Network Policies"
 *                                      -> kubernetes-network-policies-versus-cilium-network-policies
 *
 * Read the Docs ignores `.. _label:` inside a document's body for section ids;
 * only the document's own title label is used, as the page id. So the slug is
 * the only reliable anchor for an in-page section, and `anchorSource` records
 * where the anchor came from rather than which one we hope is right.
 */
function slugify(text) {
  return text
    .toLowerCase()
    // Backslash-escaped punctuation contributes its literal character.
    .replace(/\\(.)/g, '$1')
    // Smart quotes and dashes normalise so word splitting matches Sphinx.
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    // Sphinx treats whitespace, slash and backslash as word separators.
    .replace(/[\s/\\]+/g, '-')
    // Then keeps word characters, dropping other punctuation but preserving
    // digits inside a word ("l3", "v1-18-3").
    .replace(/[^\w-]/g, '')
    .trim()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Convert a chunk of rst prose into readable plain text suitable for prompting. */
function cleanBody(raw) {
  const lines = raw.split('\n');
  const out = [];
  let inLiteral = false;
  let literalLang = '';
  let skipIndent = null;

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];

    // `.. only::` blocks: keep the body only for the html builder, drop the rest.
    const only = line.match(/^(\s*)\.\. only::\s*(.+)$/);
    if (only) {
      const cond = only[2].trim();
      skipIndent = cond.includes('html') ? 'keep' : 'drop';
      continue;
    }

    if (skipIndent === 'drop') {
      // A dedent back to the directive's own column ends the block.
      if (line.trim() === '' || /^\s{3,}/.test(line) || /^\s{0,2}\S/.test(line)) {
        if (/^\s{0,2}\S/.test(line) && line.trim() !== '') skipIndent = null;
        else continue;
      } else {
        skipIndent = null;
      }
    }
    if (skipIndent === 'keep') {
      if (/^\s{0,2}\S/.test(line) && line.trim() !== '') skipIndent = null;
      else {
        line = line.slice(3);
        if (line.trim() === '') continue;
      }
    }

    // Explicit targets carry the anchor; drop the line itself.
    if (/^\s*\.\. _[^:]+:\s*$/.test(line)) continue;
    // Other directives: keep code-block content, drop the rest.
    const dir = line.match(/^(\s*)\.\. (code-block|code|literalinclude|production|note|warning|tip|important|seealso|versionadded|versionchanged|deprecated|caution|danger|hint|rst-class|raw|toctree|contents|image|figure|include)::\s*(.*)$/);
    if (dir) {
      const kind = dir[2];
      if (kind === 'code-block' || kind === 'code') {
        inLiteral = true;
        literalLang = dir[3].trim() || '';
        out.push('```' + literalLang);
        // Skip the blank line and any options (e.g. :linenos:).
        while (i + 1 < lines.length && (/^\s*:\w+:/.test(lines[i + 1]) || lines[i + 1].trim() === '')) i += 1;
        continue;
      }
      if (kind === 'toctree' || kind === 'image' || kind === 'figure' || kind === 'include' || kind === 'raw') {
        // Skip the whole directive body.
        const indent = dir[1].length;
        while (i + 1 < lines.length && (lines[i + 1].trim() === '' || lines[i + 1].match(/^\s*/)[0].length > indent)) i += 1;
        continue;
      }
      // Admonitions and admonition-likes: keep the content, drop the marker.
      out.push('');
      continue;
    }

    if (inLiteral) {
      if (line.trim() === '' || /^\s{3,}/.test(line) || line.startsWith('   ')) {
        out.push(line.replace(/^ {1,3}/, ''));
        continue;
      }
      inLiteral = false;
      out.push('```');
    }

    // Comments.
    if (/^\s*\.\.(\s|$)/.test(line) && !line.trim().startsWith('.. code')) {
      const indent = line.match(/^\s*/)[0].length;
      while (i + 1 < lines.length && (lines[i + 1].trim() === '' || lines[i + 1].match(/^\s*/)[0].length > indent)) i += 1;
      continue;
    }

    // Roles and substitutions to display text.
    line = line
      .replace(/:ref:`([^<`]*)<([^>`]+)>`/g, '$1')
      .replace(/:ref:`([^`<]+)`/g, (_, p) => p.replace(/^.*?<(.*)>$/, '$1').replace(/^[a-z_]+:/, ''))
      .replace(/:doc:`([^<`]*)<([^>`]+)>`/g, '$1')
      .replace(/:doc:`([^`]+)`/g, '$1')
      .replace(/:func:`([^`]+)`/g, '$1')
      .replace(/:term:`([^`]+)`/g, '$1')
      .replace(/:guilabel:`([^`]+)`/g, '$1')
      .replace(/:command:`([^`]+)`/g, '$1')
      .replace(/:kbd:`([^`]+)`/g, '$1')
      .replace(/:file:`([^`]+)`/g, '$1')
      .replace(/:literal:`([^`]+)`/g, '$1')
      .replace(/\|[^|]+\|/g, (m) => m.slice(1, -1));

    out.push(line);
  }
  if (inLiteral) out.push('```');

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Parse one rst file into ordered sections carrying their heading path. */
function parseFile(relPath, content) {
  const lines = content.split('\n');
  const headings = [];

  for (let i = 0; i < lines.length; i += 1) {
    // Overline form: `##### / Title / #####`. Both lines carry the same
    // character. A handful of Cilium files use it and treating it as plain
    // text silently loses the whole document.
    if (
      ULINE.test(lines[i]) &&
      i + 2 < lines.length &&
      lines[i + 1].trim() !== '' &&
      !ULINE.test(lines[i + 1]) &&
      ULINE.test(lines[i + 2]) &&
      lines[i + 2].trim()[0] === lines[i].trim()[0]
    ) {
      headings.push({
        line: i,
        bodyStart: i + 3,
        level: lines[i].trim()[0],
        title: lines[i + 1].trim(),
      });
      i += 2;
      continue;
    }

    const under = lines[i + 1];
    if (!under || !ULINE.test(under)) continue;
    const text = lines[i];
    if (text.trim() === '') continue;
    if (ULINE.test(text)) continue;
    headings.push({
      line: i,
      bodyStart: i + 2,
      level: under.trim()[0],
      title: text.trim(),
    });
  }

  if (!headings.length) return [];

  const levelOrder = [];
  for (const h of headings) {
    if (!levelOrder.includes(h.level)) levelOrder.push(h.level);
  }

  // Attach explicit targets: `.. _label:` on the line(s) above a heading.
  for (const h of headings) {
    h.label = null;
    for (let k = h.line - 1; k >= Math.max(0, h.line - 3); k -= 1) {
      const m = lines[k].match(/^\s*\.\. _([^:]+):\s*$/);
      if (m) {
        h.label = m[1].trim();
        break;
      }
      if (lines[k].trim() !== '') break;
    }
  }

  const seenSlugs = new Set();
  let duplicateCount = 0;
  const sections = [];

  for (let idx = 0; idx < headings.length; idx += 1) {
    const h = headings[idx];
    const level = levelOrder.indexOf(h.level);
    const endLine = idx + 1 < headings.length ? headings[idx + 1].line : lines.length;

    // Heading path is every ancestor heading still on the stack.
    const stack = [];
    for (let prev = idx - 1; prev >= 0; prev -= 1) {
      const plevel = levelOrder.indexOf(headings[prev].level);
      if (plevel < level && !stack.some((s) => s.level === plevel)) {
        stack.push({ level: plevel, title: headings[prev].title });
      }
    }
    stack.sort((a, b) => a.level - b.level);

    const body = lines.slice(h.bodyStart, endLine).join('\n');
    const text = cleanBody(body);
    const words = text.split(/\s+/).filter(Boolean).length;

    // The rendered section id is the slugged heading; a body `.. _label:` does
    // not change it. Keep the label for reference but never prefer it.
    let anchor = slugify(h.title);
    let anchorSource = 'slug';
    if (!anchor) {
      anchor = h.label ?? `section-${idx}`;
      anchorSource = h.label ? 'label' : 'fallback';
    }
    // Sphinx numbers duplicate headings globally per document as `id1`, `id2`,
    // … (verified against docs.cilium.io: repeated "Configuration" headings in
    // routing.rst render as configuration, id4, id5). It is not a suffix on the
    // slug and it is not a per-slug counter.
    const dupKey = anchor;
    if (seenSlugs.has(dupKey)) {
      duplicateCount += 1;
      anchor = `id${duplicateCount}`;
      anchorSource = 'duplicate';
    }
    seenSlugs.add(dupKey);
    sections.push({
      file: relPath,
      headingPath: [...stack.map((s) => s.title), h.title],
      title: h.title,
      anchor,
      anchorSource,
      level,
      wordCount: words,
      text,
    });
  }

  return sections;
}

/**
 * Collapse short sibling sections into their nearest ancestor.
 *
 * A page like `lifeofapacket.rst` is three h2 sections of 68-83 words under one
 * h1. Each is too thin to ask about on its own, but the page as a whole is a
 * coherent topic. Chunking to headings alone throws that away, so tiny siblings
 * are merged upward until the ancestor is big enough or there is nothing left
 * to merge into.
 */
function mergeShortSections(sections) {
  const result = [];
  let pending = null;

  for (const s of sections) {
    const tooSmall = s.wordCount < chunking.minWords;

    if (!tooSmall) {
      if (pending) {
        // Attach the leftovers to the section that follows them only when that
        // keeps them under the ceiling; otherwise flush them separately.
        if (pending.wordCount + s.wordCount <= chunking.maxWords) {
          result.push({
            ...s,
            text: `${pending.text}\n\n${s.text}`,
            wordCount: pending.wordCount + s.wordCount,
            mergedFrom: [...(pending.mergedFrom ?? [pending.id]), s.id],
          });
          pending = null;
          continue;
        }
        result.push(pending);
        pending = null;
      }
      result.push(s);
      continue;
    }

    if (pending) {
      const merged = {
        ...pending,
        text: `${pending.text}\n\n${s.text}`,
        wordCount: pending.wordCount + s.wordCount,
        mergedFrom: [...(pending.mergedFrom ?? [pending.id]), s.id],
      };
      pending = merged.wordCount >= chunking.minWords ? null : merged;
      if (!pending) result.push(merged);
    } else {
      pending = { ...s, mergedFrom: [s.id] };
    }
  }
  if (pending) result.push(pending);
  return result;
}

function assignDomain(section) {
  const haystack = `${section.title} ${section.headingPath.slice(-1).join(' ')}`;
  for (const rule of domainRules) {
    if (!rule.match.test(section.file)) continue;
    if (rule.headingOnly && !rule.headingOnly.test(haystack)) continue;
    return rule.domain;
  }
  return null;
}

function assignCompetency(section, domain) {
  const rules = competencyRules[domain] ?? [];
  const haystack = `${section.title} ${section.headingPath.join(' ')}`;
  for (const rule of rules) {
    if (rule.match.test(haystack)) return rule.id;
  }
  return null;
}

async function walk(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await walk(path.join(dir, entry.name), rel)));
    else if (entry.name.endsWith('.rst')) out.push(rel);
  }
  return out;
}

async function main() {
  const files = (await walk(DOCS_DIR)).sort();
  const kept = [];
  const dropped = {
    too_short: [],
    too_long: [],
    unmapped_domain: [],
    empty: [],
  };

  // Sphinx builds one anchor namespace per document, so dedupe is per file.
  const seenAnchors = new Map();

  for (const rel of files) {
    const raw = await readFile(path.join(DOCS_DIR, rel), 'utf8');
    const parsed = parseFile(rel, raw);

    for (const s of parsed) {
      if (!s.text || s.text.replace(/```/g, '').trim().length < 40) {
        dropped.empty.push(`${rel}#${s.anchor}`);
      }
    }

    const usable = parsed.filter(
      (s) => s.text && s.text.replace(/```/g, '').trim().length >= 40,
    );
    // Short siblings are kept as individual sections here so each keeps its own
    // verified anchor. Merging is a generation-time decision, applied later over
    // the resolved set, so a citation can still point at the exact heading.
    const merged = usable;

    for (const s of merged) {
      // Short sections stay in the index (their anchor is real and may be cited
      // by a merged question) but are flagged so generation skips them alone.
      const tooShort = s.wordCount < chunking.minWords;
      if (tooShort) dropped.too_short.push(`${rel}#${s.anchor} (${s.wordCount}w)`);
      if (s.wordCount > chunking.maxWords) {
        dropped.too_long.push(`${rel}#${s.anchor} (${s.wordCount}w)`);
        continue;
      }
      const domain = assignDomain(s);
      if (!domain) {
        dropped.unmapped_domain.push(`${rel}#${s.anchor}`);
        continue;
      }
      // Guard against two sections in one file landing on the same anchor.
      const key = `${rel}#${s.anchor}`;
      const seen = seenAnchors.get(key) ?? 0;
      seenAnchors.set(key, seen + 1);
      const anchor = seen === 0 ? s.anchor : `${s.anchor}-${seen}`;

      kept.push({
        id: `${rel}#${anchor}`,
        file: rel,
        anchor,
        anchorSource: s.anchorSource,
        title: s.title,
        label: s.label ?? null,
        headingPath: s.headingPath,
        domain,
        competency: assignCompetency(s, domain),
        wordCount: s.wordCount,
        tooShort,
        text: s.text,
      });
    }
  }

  const byDomain = {};
  for (const s of kept) byDomain[s.domain] = (byDomain[s.domain] ?? 0) + 1;

  const payload = {
    docsRef: docs.ref,
    generatedAt: new Date().toISOString(),
    counts: {
      files: files.length,
      sections: kept.length,
      words: kept.reduce((a, s) => a + s.wordCount, 0),
      byDomain,
      dropped: Object.fromEntries(Object.entries(dropped).map(([k, v]) => [k, v.length])),
    },
    dropped,
    sections: kept,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload)}\n`);

  process.stdout.write(
    `[chunk-rst] ${kept.length} sections from ${files.length} files ` +
      `(${payload.counts.words} words)\n`,
  );
  for (const [d, n] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`  ${domains[d]?.label ?? d}: ${n}\n`);
  }
  process.stdout.write(
    `  dropped: ${JSON.stringify(payload.counts.dropped)}\n`,
  );
}

await main();
