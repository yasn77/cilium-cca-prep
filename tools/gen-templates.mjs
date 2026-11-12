#!/usr/bin/env node
/**
 * Deterministic question generation from resolved doc sections.
 *
 * Three families, each anchored to a sentence the docs actually contain:
 *
 *   definition  — a term defined with a colon, an em dash or "is/are", asked as
 *                 "which statement about X is true?" with distractors drawn from
 *                 other definitions in the same domain.
 *   attribute   — CRD fields, `--flags`, annotations and CLI commands, asked as
 *                 "which of these …", with distractors from the same family.
 *   contrast    — sentences that explicitly compare two things ("unlike",
 *                 "instead of", "versus").
 *
 * Every candidate carries the exact quote it was built from, so verification can
 * prove the claim is in the docs rather than trusting this script.
 *
 * No model is involved. Output is deterministic: the same sections produce the
 * same file byte for byte, which is what makes the corpus diff reviewable.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { docs, chunking, domains } from './config.mjs';
import { ROOT, stableId, idKey, citationUrl, readJson, writeJsonl, log, normaliseSpace } from './lib.mjs';

const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');
const OUT = path.join(ROOT, 'candidates', 'templates.jsonl');
const MIN_WORDS = 50;

/** Capitalise the first letter and end with exactly one full stop. */
function sentenceCase(text) {
  const t = String(text).trim();
  if (!t) return t;
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

/** Sentences from a section, in order, with the bullets kept as whole units. */
function sentences(text) {
  const noCode = text.replace(/```[\s\S]*?```/g, ' ');
  const lines = noCode.split('\n');
  const out = [];
  let buf = '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (buf) out.push(buf);
      buf = '';
      continue;
    }
    // A list item is its own sentence unit.
    if (/^([-*#]|\d+\.)\s+/.test(line)) {
      if (buf) out.push(buf);
      out.push(line.replace(/^([-*#]|\d+\.)\s+/, ''));
      buf = '';
      continue;
    }
    buf += (buf ? ' ' : '') + line;
    if (/[.!?]["')\]]?\s*$/.test(line)) {
      out.push(buf);
      buf = '';
    }
  }
  if (buf) out.push(buf);
  return out
    .map((s) => normaliseSpace(s))
    .filter((s) => s.length >= 40 && s.length <= 420)
    // Drop anything that is mostly markup, a table row or a path listing.
    .filter((s) => !/^\|/.test(s) && !/^\.\./.test(s) && (s.match(/[a-z]/g) ?? []).length > 20);
}

/**
 * Rst definition lists: a bare term line followed by an indented body.
 *
 *     default
 *       This is the default behavior for policy enforcement.
 *
 * This is how the Cilium docs define nearly every concept in the policy,
 * datapath and CLI chapters, so missing it costs the single largest source of
 * genuine definition questions.
 *
 * Guard rails, because a naive scan of indented lines picks up code samples and
 * YAML continuations and produces nonsense questions:
 *   - the term must look like prose (letters and spaces, no code punctuation);
 *   - the term must be preceded by a blank line, which is what distinguishes a
 *     definition list from the middle of a wrapped sentence;
 *   - the body must read as a sentence, not as config.
 */
function definitionLists(rawText) {
  const text = stripLiterals(rawText);
  const lines = text.split('\n');
  const out = [];
  for (let i = 1; i < lines.length - 1; i += 1) {
    const term = lines[i].replace(/^\s*/, '');
    const prev = lines[i - 1];
    const next = lines[i + 1];
    if (!term || term.length > 60 || /[.:;]$/.test(term)) continue;
    if (prev.trim() !== '') continue;
    if (!/^\s{2,}\S/.test(next)) continue;
    if (/^\s*\.\./.test(next)) continue;
    if (/^([-*#]|\d+\.)\s/.test(term)) continue;
    // A prose term: starts with a letter, no code punctuation, few symbols.
    if (!/^[A-Za-z][A-Za-z0-9 \-_/().]*$/.test(term)) continue;
    if ((term.match(/[a-z]/g) ?? []).length < 3) continue;

    const bodyLines = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j].trim() === '') {
        if (bodyLines.length) break;
        continue;
      }
      if (!/^\s{2,}/.test(lines[j])) break;
      bodyLines.push(lines[j].trim());
    }
    if (!bodyLines.length) continue;
    const body = normaliseSpace(bodyLines.join(' '));
    if (body.length < 40 || body.length > 400) continue;
    if (!proseLike(body)) continue;
    // The quote must be verbatim source, not a synthesised "term: body" string,
    // otherwise verification cannot confirm it appears in the docs. Use the
    // body itself, which does appear contiguously once the rst has been joined.
    out.push({ term: term.trim(), body, sentence: normaliseSpace(bodyLines.join(' ')), quote: body });
  }
  return out;
}

/**
 * Remove literal blocks entirely.
 *
 * The chunker turns `.. code-block::` bodies into fenced blocks for the
 * prompt, but for question extraction they are poison: a YAML sample
 * "annotations:\n  service.cilium.io/global: \"true\"" looks exactly like a
 * definition list to a line scanner and yields a question whose answer is a
 * fragment of config.
 */
function stripLiterals(text) {
  return text.replace(/```[\s\S]*?```/g, '\n\n');
}

/** Does this read as an English sentence rather than a config fragment? */
function proseLike(s) {
  if (/^\$ /.test(s)) return false;
  if (/^\s*\d{4}-\d{2}-\d{2}T/.test(s)) return false;
  if (/\b(NAME|READY|STATUS|AGE|RESTARTS)\b.*\b(Age|Running)\b/.test(s)) return false;
  if (/\.\.\./.test(s) && /\$/.test(s)) return false;
  const letters = (s.match(/[A-Za-z]/g) ?? []).length;
  if (letters < s.length * 0.7) return false;
  if (/[{};\[\]\\]/.test(s)) return false;
  if (/^[a-z]+:\s/i.test(s)) return false;
  if ((s.match(/[A-Za-z]+=/g) ?? []).length > 2) return false;
  // Needs at least a few lowercase words in a row.
  return /[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/.test(s);
}

/** Simple two-column tables: first cell is the subject, second the description. */
function tableRows(rawText) {
  const text = stripLiterals(rawText);
  const lines = text.split('\n');
  const out = [];
  for (const line of lines) {
    const l = line.trim();
    if (!l.startsWith('|')) continue;
    const cells = l.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const [a, b] = cells;
    if (a.length > 50 || b.length < 40) continue;
    if (/^[-=+]+$/.test(a)) continue;
    if (!/^[A-Za-z][A-Za-z0-9 \-_/().]*$/.test(a)) continue;
    if (!proseLike(b)) continue;
    out.push({ term: a, body: normaliseSpace(b), sentence: normaliseSpace(b), quote: normaliseSpace(b) });
  }
  return out;
}

const DEF_PATTERNS = [
  /^(?:The\s+)?([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,4})\s+is\s+(?:an?|the)\s+([^.]{20,240})\./,
  /^(?:The\s+)?([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,4})\s+are\s+([^.]{20,240})\./,
  /^([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,4}):\s+([^.]{20,240})\./,
  /^([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,4})\s+\u2014\s+([^.]{20,240})\./,
];

const CONTRAST_CUES = [
  /\bunlike\b/i,
  /\binstead of\b/i,
  /\bversus\b/i,
  /\bcompared (?:to|with)\b/i,
  /\bas opposed to\b/i,
  /\brather than\b/i,
];

/**
 * Titles that are really section context, not a definable term.
 *
 * Without this, a definition list continuing past a heading reads as
 * "Once CRDs", "Attached Routes" and similar fragments, which produce
 * unanswerable questions.
 */
const BAD_TERMS = /^(default|see|note|warning|tip|example|if|when|this|the|by default|for example|once|also|then|now|however|next|first|finally)$/i;
const CONTEXT_PREFIX = /^(once|also|then|now|however|next|first|finally|and|but|so|because|when|while|after|before|during)\b/i;

/** A term has to read as a noun phrase: letters, digits, spaces and simple joins. */
function plausibleTerm(term) {
  if (!term || term.length < 3 || term.length > 55) return false;
  if (CONTEXT_PREFIX.test(term)) return false;
  if (/[:;{}\[\]<>|]/.test(term)) return false;
  if (/\d{4}-\d{2}-\d{2}/.test(term)) return false;
  if ((term.match(/[a-z]/g) ?? []).length < 3) return false;
  // A term of more than four words is usually a wrapped sentence.
  if (term.split(/\s+/).length > 4) return false;
  return true;
}

/**
 * A distractor has to read as a claim about Cilium, not as command output or a
 * status table row. Status text like "Attached Routes: 2 Conditions:" makes the
 * wrong answers trivially identifiable without knowing Cilium, which is exactly
 * the defect the judge is asked to catch.
 */
function plausibleClause(text) {
  if (!text) return false;
  // Status and table output: "Ok etcd: 1/1 connected", "LEASE-ID=…".
  if (/^[A-Z][a-zA-Z ]+:\s/.test(text)) return false;
  if (/\b(lease-ID|has-quorum|ok etcd|connected,|\d+\/\d+ connected)/i.test(text)) return false;
  // Command invocations pasted as prose.
  if (/\b(cilium|kubectl|helm|hubble)\s+[a-z][a-z-]+\s+--/.test(text)) return false;
  if (/\$\s*[a-z]/.test(text)) return false;
  if (/\b(Conditions|Reason|Programmed|READY|STATUS)\b/.test(text)) return false;
  // Key=value clusters are config, not a claim.
  if ((text.match(/[A-Za-z_.-]+=/g) ?? []).length >= 2) return false;
  // File paths and URLs are not answers.
  if (/\/[a-z0-9_.-]+\/[a-z0-9_.\/-]+/.test(text) && !/\b(is|are|allows|means)\b/i.test(text)) return false;
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  if (letters < text.length * 0.75) return false;
  // Needs to read as a sentence: a finite verb somewhere.
  if (!/\b(is|are|was|were|has|have|can|will|allows?|enables?|means|requires?|provides?|uses?|defines?|routes?|stores?|runs?|sends?|handles?)\b/i.test(text)) return false;
  if (!/[a-z]{3,}\s+[a-z]{3,}/.test(text)) return false;
  return text.split(/\s+/).length >= 5;
}

function cleanTerm(term) {
  return term
    // A definition list in the docs sometimes carries the enclosing heading in
    // parentheses, e.g. "Kubernetes CRDs (Default)". That is section context,
    // not part of the term.
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

function pickDefinitions(section, seenTerms) {
  const out = [];

  // Definition lists first: they are the docs' own explicit definitions.
  for (const d of definitionLists(section.text)) {
    const term = cleanTerm(d.term);
    const key = term.toLowerCase();
    if (!plausibleTerm(term) || BAD_TERMS.test(term)) continue;
    // The body has to be a claim, not shell output. A definition whose body is
    // "Ok etcd: 1/1 connected" is not a question, whatever its distractors are.
    if (!plausibleClause(d.body)) continue;
    if (seenTerms.has(key)) continue;
    seenTerms.add(key);
    out.push({ term, body: d.body, sentence: d.sentence ?? d.body, quote: d.quote ?? d.body });
  }

  for (const d of tableRows(section.text)) {
    const term = cleanTerm(d.term);
    const key = term.toLowerCase();
    if (!plausibleTerm(term) || !plausibleClause(d.body)) continue;
    if (seenTerms.has(key)) continue;
    seenTerms.add(key);
    out.push({ term, body: d.body, sentence: d.sentence ?? d.body, quote: d.quote ?? d.body });
  }

  for (const s of sentences(section.text)) {
    for (const re of DEF_PATTERNS) {
      const m = s.match(re);
      if (!m) continue;
      const term = m[1].trim();
      const body = m[2].trim();
      if (term.length < 3 || term.split(' ').length > 5) continue;
      if (seenTerms.has(term.toLowerCase())) continue;
      // Reject vague subjects and headings that are really section titles.
      if (/^(this|it|these|they|there|the following)$/i.test(term)) continue;
      seenTerms.add(term.toLowerCase());
      out.push({ term, body, sentence: s, quote: s });
      break;
    }
  }
  return out;
}

function pickAttributes(section) {
  const out = [];
  const text = section.text;
  // CRD kinds and their purpose, e.g. "CiliumBGPClusterConfig: Defines BGP instances…"
  for (const m of text.matchAll(/\b(Cilium[A-Z][A-Za-z]+)\b\s*:?\s*(?:is|are|defines?|configures?|specifies?)\s+([^.]{25,220})\./g)) {
    out.push({ kind: 'crd', name: m[1], body: normaliseSpace(m[2]), sentence: normaliseSpace(m[0]) });
  }
  // Helm flags.
  for (const m of text.matchAll(/`?--?([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*)=([^`\s,]+)`?\s*(?:enables|sets|configures|disables|controls)\s+([^.]{20,200})\./gi)) {
    out.push({ kind: 'flag', name: m[1], value: m[2], body: normaliseSpace(m[3]), sentence: normaliseSpace(m[0]) });
  }
  // Annotations, e.g. service.cilium.io/global.
  for (const m of text.matchAll(/`?(?:service|io)\.cilium(?:\.io)?\/[a-z0-9-]+`?\s*(?:annotation)?\s*(?:set to|marks|makes|ensures|allows)\s+([^.]{20,220})\./gi)) {
    out.push({ kind: 'annot', name: m[0].split(/\s/)[0].replace(/`/g, ''), body: normaliseSpace(m[1]), sentence: normaliseSpace(m[0]) });
  }
  return out;
}

function pickContrasts(section) {
  const out = [];
  for (const s of sentences(section.text)) {
    if (!CONTRAST_CUES.some((re) => re.test(s))) continue;
    out.push({ sentence: s });
  }
  return out.slice(0, 4);
}

function shuffle(arr, seedStr) {
  // Deterministic shuffle so reruns produce an identical file.
  let h = 0;
  for (let i = 0; i < seedStr.length; i += 1) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function withOrdinal(section, rows, takeOrdinal) {
  return rows.map((r) => {
    const ordinal = takeOrdinal(section);
    return {
      id: stableId(section.file, section.renderedAnchor ?? section.anchor, ordinal),
      ordinal,
      ...r,
    };
  });
}

async function main() {
  const data = JSON.parse(await readFile(SECTIONS, 'utf8'));
  const sources = await readJson(path.join(ROOT, 'data', 'sources.json'), {});
  const docsSha = sources?.docs?.sha ?? 'unknown';

  const usable = data.sections.filter(
    (s) => (s.renderStatus === 'verified' || s.renderStatus === 'verified-merged') && s.renderedAnchor && !s.tooShort && s.wordCount >= MIN_WORDS,
  );

  // Pool of every definition across a domain, used for distractors. Distractors
  // must be real statements from the docs, not invented ones: an invented
  // distractor is a claim we cannot cite, which is exactly what this project
  // refuses to ship.
  const defsByDomain = new Map();
  for (const s of usable) {
    const seen = new Set();
    const defs = pickDefinitions(s, seen);
    if (!defsByDomain.has(s.domain)) defsByDomain.set(s.domain, []);
    for (const d of defs) defsByDomain.get(s.domain).push({ ...d, section: s });
  }

  const candidates = [];

  // One ordinal pool per rendered anchor, not per section. Sections that resolve
  // to the same anchor (a short section merged into its parent heading) would
  // otherwise both number from 0 and mint the same stableId.
  const nextOrdinalByGroup = new Map();
  function takeOrdinal(section) {
    const group = idKey(section.file, section.renderedAnchor ?? section.anchor);
    const next = nextOrdinalByGroup.get(group) ?? 0;
    nextOrdinalByGroup.set(group, next + 1);
    return next;
  }

  for (const section of usable) {
    const seenTerms = new Set();
    const rows = [];

    // ---- definitions -------------------------------------------------------
    const defs = pickDefinitions(section, seenTerms).slice(0, 4);
    const pool = defsByDomain.get(section.domain) ?? [];
    for (const d of defs) {
      const others = pool
        .filter((o) => o.term.toLowerCase() !== d.term.toLowerCase() && o.body.length > 25)
        .filter((o) => Math.abs(o.body.length - d.body.length) < 140)
        .filter((o) => plausibleClause(o.body));
      if (others.length < 3) continue;
      const chosen = shuffle(others, d.term).slice(0, 3);
      const options = shuffle(
        [
          { text: sentenceCase(d.body) },
          ...chosen.map((o) => ({ text: sentenceCase(o.body) })),
        ],
        d.term + section.id,
      );
      const answerText = sentenceCase(d.body);
      const answerIdx = options.findIndex((o) => o.text === answerText);
      if (answerIdx < 0) continue;
      const letters = ['a', 'b', 'c', 'd', 'e'];
      rows.push({
        family: 'definition',
        yieldSource: 'definition',
        stem: `Which statement best describes ${d.term} in Cilium?`,
        options: options.map((o, i) => ({ id: letters[i], text: o.text })),
        answer: letters[answerIdx],
        explanation: d.sentence,
        optionRationale: Object.fromEntries(
          chosen.map((o) => {
            const idx = options.findIndex((x) => x.text === sentenceCase(o.body));
            return idx >= 0 && idx !== answerIdx
              ? [letters[idx], `This describes ${o.term}, not ${d.term}.`]
              : null;
          }).filter(Boolean),
        ),
        citations: [
          {
            file: section.file,
            anchor: section.renderedAnchor,
            title: section.title,
            quote: (d.quote ?? d.sentence).slice(0, 300),
            url: citationUrl(section.file, section.renderedAnchor),
          },
        ],
      });
    }

    // ---- attributes --------------------------------------------------------
    const attrs = pickAttributes(section).slice(0, 5);
    for (const a of attrs) {
      const label =
        a.kind === 'crd' ? `the ${a.name} resource` : a.kind === 'flag' ? `the \`--${a.name}\` option` : `the ${a.name} annotation`;
      const distractors = attrs.filter((b) => b !== a).slice(0, 3);
      if (distractors.length < 3) continue;
      const options = shuffle(
        [a.body, ...distractors.map((d) => d.body)].map((t) => ({
          text: sentenceCase(t),
        })),
        a.name,
      );
      const answerText = sentenceCase(a.body);
      const answerIdx = options.findIndex((o) => o.text === answerText);
      if (answerIdx < 0) continue;
      const letters = ['a', 'b', 'c', 'd', 'e'];
      rows.push({
        family: 'attribute',
        yieldSource: 'attribute',
        stem: `What does ${label} do?`,
        options: options.map((o, i) => ({ id: letters[i], text: o.text })),
        answer: letters[answerIdx],
        explanation: a.sentence,
        optionRationale: Object.fromEntries(
          distractors
            .map((d) => {
              const t = sentenceCase(d.body);
              const idx = options.findIndex((x) => x.text === t);
              const other =
                d.kind === 'crd' ? `the ${d.name} resource` : d.kind === 'flag' ? `\`--${d.name}\`` : `the ${d.name} annotation`;
              return idx >= 0 && idx !== answerIdx ? [letters[idx], `This describes ${other} instead.`] : null;
            })
            .filter(Boolean),
        ),
        citations: [
          {
            file: section.file,
            anchor: section.renderedAnchor,
            title: section.title,
            quote: (a.quote ?? a.sentence).slice(0, 300),
            url: citationUrl(section.file, section.renderedAnchor),
          },
        ],
      });
    }

    // ---- contrasts ---------------------------------------------------------
    // Contrast questions only work when the comparison is between two named
    // approaches the docs actually set against each other. A "By contrast, …"
    // filler option from an unrelated section is not a plausible distractor and
    // makes the answer obvious, so those are skipped rather than padded.
    const contrasts = pickContrasts(section).slice(0, 1);
    for (const c of contrasts) {
      const claim = c.sentence;
      if (claim.length < 100) continue;
      const anchorMatch = claim.match(/^(.*?)\s+(?:unlike|instead of|versus|compared (?:to|with)|as opposed to|rather than)\s+([^,.]{3,60})/i);
      if (!anchorMatch) continue;
      const alternatives = (defsByDomain.get(section.domain) ?? [])
        .filter((o) => o.section.id === section.id && o.sentence.length > 60)
        .slice(0, 0);
      void alternatives;
      // Build distractors by negating the claim's comparison rather than
      // inventing facts: swap the two sides of the comparison.
      const subject = anchorMatch[1].trim();
      const object = anchorMatch[2].trim();
      if (subject.length < 15) continue;
      const options = [
        { text: claim },
        { text: `${object.charAt(0).toUpperCase()}${object.slice(1)} is used where ${subject.toLowerCase()} would be used, with the same behaviour described above.` },
      ];
      if (options.length < 4) continue;
      const letters = ['a', 'b', 'c', 'd', 'e'];
      rows.push({
        family: 'contrast',
        yieldSource: 'contrast',
        stem: `Which statement about ${section.title} is correct?`,
        options: options.map((o, i) => ({ id: letters[i], text: o.text })),
        answer: letters[0],
        explanation: claim,
        optionRationale: { b: 'This reverses the comparison the documentation makes.' },
        citations: [
          {
            file: section.file,
            anchor: section.renderedAnchor,
            title: section.title,
            quote: claim.slice(0, 300),
            url: citationUrl(section.file, section.renderedAnchor),
          },
        ],
      });
    }

    if (!rows.length) continue;

    const withIds = withOrdinal(section, rows, takeOrdinal);
    for (const r of withIds) {
      candidates.push({
        ...r,
        domain: section.domain,
        competency: section.competency ?? null,
        type: 'single',
        provenance: {
          generator: { kind: 'template', templateId: r.family, version: '1.0.0' },
          docsRef: docs.ref,
          docsSha,
          sectionId: section.id,
          createdAt: null, // stamped by verify to keep the file deterministic
        },
      });
    }
  }

  await writeJsonl(OUT, candidates);

  const byDomainCounts = {};
  const byFamily = {};
  for (const c of candidates) {
    byDomainCounts[c.domain] = (byDomainCounts[c.domain] ?? 0) + 1;
    byFamily[c.family] = (byFamily[c.family] ?? 0) + 1;
  }
  log('gen-templates', `${candidates.length} candidates`);
  for (const [d, n] of Object.entries(byDomainCounts).sort((a, b) => b[1] - a[1])) {
    log('gen-templates', `  ${domains[d]?.label ?? d}: ${n}`);
  }
  log('gen-templates', `  families: ${JSON.stringify(byFamily)}`);
}

await main();
