#!/usr/bin/env node
/**
 * Build the held-out blind evaluation set.
 *
 * The source is the public CNCF practice-exam repository on GitLab. Those
 * questions are *not* used to build the practising corpus — they are kept
 * separate precisely because they were written independently of it, which is
 * what makes a score on them mean something.
 *
 * The markdown files carry an answer key with letters, so the parse is textual
 * and checkable rather than inferred.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, writeJson, log } from './lib.mjs';

const PROJECT = 'cncf-exams/certified-cillium-associate-cca';
const FILES = ['9. Practice Exam.md', '10. Practice Exam 2.md'];
const OUT = path.join(ROOT, 'data', 'blind-set.json');

const DOMAIN_HINTS = [
  [/architectur|ipam|component|datapath|identity/i, 'architecture'],
  [/network policy|policy/i, 'network-policy'],
  [/service mesh|ingress|gateway|encrypt/i, 'service-mesh'],
  [/observab|hubble/i, 'observability'],
  [/installation|configuration/i, 'installation'],
  [/cluster mesh/i, 'cluster-mesh'],
  [/ebpf|bpf/i, 'ebpf'],
  [/bgp|external/i, 'bgp'],
];

async function fetchRaw(file) {
  const url = `https://gitlab.com/${PROJECT}/-/raw/main/${encodeURIComponent(file)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return { text: await res.text(), url };
}

/**
 * Parse one practice exam.
 *
 * Question blocks look like:
 *   1. **Which component ...?**
 *      - [ ] **A)** Cilium Operator
 *    then an answer key at the end:
 *   1. **C) Cilium Agent**
 *      *Explanation:* ...
 */
export function parseExam(markdown) {
  const [body, keyPart] = markdown.split(/\*\*Answer Key/i);
  if (!keyPart) throw new Error('no answer key found');

  const questions = [];
  let currentDomain = null;

  // Sections carry the domain in their heading, e.g. "Section 1: Architecture (20%)"
  for (const chunk of body.split(/\n(?=\d+\.\s+\*\*)/)) {
    const sec = chunk.match(/##\s+\*\*Section[^*]*:\s*([^(*]+)/i);
    if (sec) currentDomain = sec[1].trim();

    const m = chunk.match(/^(\d+)\.\s+\*\*([\s\S]*?)\*\*\s*\n([\s\S]*)$/);
    if (!m) continue;
    const number = Number(m[1]);
    const stem = m[2].replace(/\s+/g, ' ').trim();
    const rest = m[3];

    const options = [];
    for (const opt of rest.matchAll(/-\s*\[\s*\]\s*\*\*([A-E])\)\*\*\s*([\s\S]*?)(?=\n\s*-\s*\[\s*\]|\n\s*\n|\n\d+\.|$)/g)) {
      const text = opt[2].replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) options.push({ id: opt[1].toLowerCase(), text });
    }
    if (options.length < 3) continue;
    if (stem.length < 15) continue;

    questions.push({ number, stem, options, section: currentDomain });
  }

  // Answer key: "1. **C) Cilium Agent**"
  const answers = new Map();
  for (const m of keyPart.matchAll(/^\s*(\d+)\.\s+\*\*([A-E])\)/gm)) {
    answers.set(Number(m[1]), m[2].toLowerCase());
  }

  return questions
    .filter((q) => answers.has(q.number))
    .map((q) => {
      const answer = answers.get(q.number);
      const present = q.options.some((o) => o.id === answer);
      if (!present) return null;
      return { ...q, answer };
    })
    .filter(Boolean);
}

function mapDomain(sectionTitle, stem) {
  const hay = `${sectionTitle ?? ''} ${stem}`;
  for (const [re, domain] of DOMAIN_HINTS) if (re.test(hay)) return domain;
  return null;
}

async function main() {
  const all = [];
  const sources = [];
  for (const file of FILES) {
    const { text, url } = await fetchRaw(file);
    const parsed = parseExam(text);
    log('blind-set', `${file}: ${parsed.length} questions`);
    sources.push({ file, url, questions: parsed.length });
    for (const q of parsed) {
      all.push({
        id: `blind-${file.slice(0, 2).trim()}-${q.number}`,
        domain: mapDomain(q.section, q.stem),
        type: 'single',
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        explanation: null,
        citations: [],
        source: `CNCF practice exam: ${file}`,
      });
    }
  }

  if (all.length < 30) {
    log('blind-set', `only ${all.length} parsed; refusing to write a set that small`);
    process.exit(1);
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeJson(OUT, {
    generatedAt: new Date().toISOString(),
    note: 'Held out from the practising corpus. Used only for blind self-assessment.',
    licence: 'See NOTICE: third-party content from the public CNCF practice-exam repository.',
    sources,
    questions: all,
  });
  log('blind-set', `wrote ${all.length} questions to data/blind-set.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
void writeFile;
