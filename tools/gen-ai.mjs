#!/usr/bin/env node
/**
 * LLM question generation, one section at a time, quota-driven.
 *
 * Why per section rather than per file: a 41 KB BGP configuration page covers a
 * dozen distinct topics and a 329-byte table of contents covers none. Asking
 * per section keeps each question anchored to one coherent passage, which is
 * what makes the citation meaningful and the grounding check enforceable.
 *
 * Why quota-driven: an unconstrained run gives whatever the model finds most
 * quotable — usually policy YAML and Hubble flags — and starves eBPF and BGP.
 * Coverage is an input here, not a hope.
 *
 * Grounding is enforced twice: the prompt forbids outside facts, and every
 * candidate's quote is checked against the section text before it is written
 * out. A model that invents a fact cannot get past the second check.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { docs, domains, quota, providers, blueprintFiles } from './config.mjs';
import {
  ROOT,
  stableId,
  idKey,
  citationUrl,
  readJson,
  writeJson,
  writeJsonl,
  readJsonl,
  log,
  quotePresent,
} from './lib.mjs';
import { chat, generatorConfig, extractJson, getUsage } from './llm.mjs';
import { checkWording, checkOptionWording } from './wording.mjs';

const SECTIONS = path.join(ROOT, 'corpus', 'sections.json');
const OUT = path.join(ROOT, 'candidates', 'ai.jsonl');
const COVERAGE = path.join(ROOT, 'data', 'coverage.json');
const TEMPLATES = path.join(ROOT, 'candidates', 'templates.jsonl');

const args = new Set(process.argv.slice(2));
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) ?? '').split('=')[1]) || 0;
const PER_SECTION = Number((process.argv.find((a) => a.startsWith('--per-section=')) ?? '').split('=')[1]) || 3;
const RECHECK = args.has('--recheck');
// Regenerate one section by id substring, ignoring its deficit. Used to test a
// prompt change against a specific page rather than a whole domain.
const SECTION_FILTER = (process.argv.find((a) => a.startsWith('--section=')) ?? '').split('=').slice(1).join('=') || '';
/**
 * Target sections that contain a manifest.
 *
 * A question that shows a policy and then asks what happens is the shape the
 * real exam uses, and it is only possible where the documentation has a manifest
 * to show. Restricting generation to those sections is how the corpus gets them,
 * rather than hoping a free-running pass happens to pick them.
 */
const MANIFESTS_ONLY = args.has('--manifests-only');

// Sections shorter than this are too thin to carry a question on their own.
// The chunker's own floor is 120; keeping this equal to it means the whole
// verified index is generation-eligible, which matters for the domains that
// are documented in many short sections (eBPF, BGP, Cluster Mesh).
const MIN_GEN_WORDS = 50;

const SYSTEM_PROMPT = `You write multiple-choice exam questions for a study app used to prepare engineers for the Cilium Certified Associate (CCA) certification.

Hard rules, in order of importance:
1. Every fact in the question and in the correct answer must come from the SOURCE EXCERPT provided. Do not use knowledge from elsewhere, do not generalise beyond it, and do not invent flag names, resource names, defaults or numbers.
2. Exactly one option must be correct. The other three must be plausible to someone who has read about Cilium but is wrong on this specific point.
3. Cite by quoting. The "quote" field must be copied verbatim from the SOURCE EXCERPT — a contiguous run of text, at least 40 characters, that contains the fact the answer depends on.
4. Write scenario questions where the excerpt allows it: describe a situation and ask what happens or which option to use, rather than asking for a dictionary definition.
5. British English with Oxford spelling in the explanation, except inside quoted code, flags and resource names, which must reproduce the source exactly.
6. If the question depends on a manifest, command output or passage, put that material in "attachments" copied verbatim from the SOURCE EXCERPT. A question that shows the policy and then asks about "the policy" is exactly what a real exam item looks like.

7. The question must stand alone as an exam item. Never refer to the excerpt, the passage, the source, or "the documentation", and never write "according to the excerpt" or "as shown above". The reader sees only your question, not where it came from.

8. A definite reference — "the rule", "this policy", "the manifest", "the output" — is only acceptable if the item shows what it refers to, either in the stem or in an attachment. Do not use one otherwise.

Good, with an attachment: the attachments carry the CiliumNetworkPolicy named rule1 with endpointSelector org=empire, class=deathstar and an HTTP rule allowing only POST /v1/request-landing. The stem may then say "After this policy is applied, a pod labelled app=xwing sends POST /v1/request-landing and gets no response. Why?" — the reader has been shown the policy.
Bad: the same question with no attachment. The reader has to guess what the policy allows.

9. Write at ASSOCIATE level, the level of the Cilium Certified Associate exam. Short stems of one to three sentences. Ask about:
   - what a component does (agent vs operator vs CNI vs Hubble Relay)
   - the identity-based security model and the three enforcement modes
   - a standard cilium or hubble CLI command and what it shows
   - reading a common CiliumNetworkPolicy or Gateway API manifest
   - comparing two core features (WireGuard vs IPsec, Ingress vs Gateway API,
     encapsulation vs native routing, sidecar vs sidecarless)
   Do NOT ask about: internal gRPC service names or ports, eBPF map internals or
   struct names, socket-level tracing internals, obscure ConfigMap or Helm flags,
   cloud-provider setup steps, version-migration flags, or scale-benchmark
   numbers. If the source excerpt only supports that kind of detail, write
   nothing for this section rather than mining trivia from it.

Return JSON only, with this exact shape and nothing outside it:
{"questions":[{"stem":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"answer":"a","explanation":"...","optionRationale":{"b":"...","c":"...","d":"..."},"quote":"verbatim excerpt text","yieldSource":"scenario","attachments":[{"kind":"manifest","title":"The policy under test","language":"yaml","body":"apiVersion: cilium.io/v2\\nkind: CiliumNetworkPolicy\\n..."}]}]}

"attachments" is optional. Include it whenever the question depends on material the reader must see. Each "body" must be copied verbatim from the SOURCE EXCERPT, including indentation, because it is checked against the documentation. kind is one of "manifest" (YAML or JSON), "output" (command output), "text" (a prose passage) or "diagram" (leave body empty and give a title only; diagrams are not generated).

yieldSource must be exactly one of these four strings, spelled exactly:
  "scenario"   a situation is described and the reader must reason about it
  "contrast"   two approaches or modes are distinguished
  "attribute"  a resource, field, flag or annotation is identified
  "definition" a concept is defined`;

function safeHost(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return String(baseUrl);
  }
}

function buildUserPrompt(section, need) {
  return `DOMAIN: ${domains[section.domain]?.label ?? section.domain}
COMPETENCY: ${section.competency ?? 'general'}
SECTION TITLE: ${section.headingPath.join(' > ')}

SOURCE EXCERPT (the only permitted source of facts):
"""
${section.text.slice(0, 6000)}
"""

Write ${need} question${need === 1 ? '' : 's'} about this excerpt. At least ${Math.max(1, Math.ceil(need * quota.scenarioMinShare))} must be scenario-based. Return JSON only.`;
}

/**
 * Questions per model call.
 *
 * Asking for many at once is the main source of wasted work: at 22 questions the
 * model needs roughly 9,000 output tokens, overruns the 3,000-token cap, and
 * returns truncated JSON. Measured on a full run, 376 of 387 calls came back
 * unparseable. Six per call keeps every response inside the budget, and the
 * caller loops for the remainder.
 */
const MAX_QUESTIONS_PER_CALL = 6;
// No section may produce more than this, however high --per-section is set.
const PER_SECTION_CEILING = 6;

async function generateForSection(section, need, cfg) {
  const rows = [];
  let model = null;
  let rejected = null;

  for (let remaining = need; remaining > 0; remaining -= MAX_QUESTIONS_PER_CALL) {
    const ask = Math.min(remaining, MAX_QUESTIONS_PER_CALL);
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(section, ask) },
    ];
    let text;
    try {
      const out = await chat(messages, { cfg });
      text = out.text;
      model = out.model;
    } catch (err) {
      rejected = `request-failed:${err.message.slice(0, 40)}`;
      break;
    }
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.questions)) {
      rejected = parsed ? 'response-shape' : 'unparseable-response';
      continue;
    }
    rows.push(...parsed.questions);
    // Stop early when the model is producing fewer than asked for: the section is
    // running out of distinct facts and another call will not help.
    if (parsed.questions.length < ask) break;
  }

  if (!rows.length && rejected) return { rows: [], rejected };
  return { rows, model };
}

/**
 * Normalise and ground attachments.
 *
 * A manifest or output block is only useful if it is real: the same standard as
 * the citation quote applies, so the body is checked as a substring of the cited
 * section, ignoring whitespace. A diagram is accepted on its title alone because
 * nothing generates one yet.
 */
function normalizeAttachments(raw, section, reasons) {
  if (!Array.isArray(raw) || !raw.length) return [];
  const out = [];
  for (const a of raw.slice(0, 2)) {
    if (!a || typeof a !== 'object') continue;
    const kind = ['manifest', 'output', 'text', 'diagram'].includes(a.kind) ? a.kind : null;
    const title = String(a.title ?? '').trim();
    if (!kind || title.length < 3) {
      reasons.push('attachment-invalid');
      continue;
    }
    if (kind === 'diagram') {
      out.push({ kind, title });
      continue;
    }
    const body = String(a.body ?? '');
    if (body.trim().length < 10) {
      reasons.push('attachment-empty');
      continue;
    }
    if (!quotePresent(body, section.text)) {
      reasons.push('attachment-not-in-source');
      continue;
    }
    out.push({
      kind,
      title,
      ...(a.language ? { language: String(a.language).trim() } : {}),
      body: body.replace(/\s+$/, ''),
    });
  }
  return out;
}

function validate(row, section, model, cfg) {
  const reasons = [];
  // Normalise doubled backticks (``devices``) to a single pair at the boundary,
  // so the corpus contains one convention and the renderer only has one case.
  const clean = (s) => String(s ?? '').replace(/``([^`]+)``/g, '`$1`').trim();
  row.stem = clean(row.stem);
  if (Array.isArray(row.options)) row.options = row.options.map((o) => ({ ...o, text: clean(o.text) }));
  row.explanation = clean(row.explanation);
  if (typeof row.stem !== 'string' || row.stem.trim().length < 20) reasons.push('stem-too-short');
  if (!Array.isArray(row.options) || row.options.length < 4) reasons.push('too-few-options');
  if (reasons.length) return { reasons };

  const ids = row.options.map((o) => o.id);
  const letters = ['a', 'b', 'c', 'd', 'e'];
  if (new Set(ids).size !== ids.length) reasons.push('duplicate-option-ids');
  if (!ids.every((id) => letters.includes(id))) reasons.push('bad-option-ids');
  if (!letters.slice(0, row.options.length).includes(row.answer)) reasons.push('answer-not-an-option');
  if (ids.filter((id) => id === row.answer).length !== 1) reasons.push('answer-not-unique');
  const texts = row.options.map((o) => String(o.text ?? '').trim().toLowerCase());
  if (new Set(texts).size !== texts.length) reasons.push('duplicate-option-text');
  if (row.options.some((o) => !o.text || String(o.text).trim().length < 3)) reasons.push('empty-option');

  if (typeof row.explanation !== 'string' || row.explanation.trim().length < 40) reasons.push('explanation-too-short');
  if (typeof row.quote !== 'string' || row.quote.trim().length < 40) reasons.push('quote-too-short');
  else if (!quotePresent(row.quote, section.text)) reasons.push('quote-not-in-source');

  const rationale = row.optionRationale ?? {};
  const wrongIds = ids.filter((id) => id !== row.answer);
  const missing = wrongIds.filter((id) => !rationale[id] || String(rationale[id]).trim().length < 10);
  if (missing.length) reasons.push(`missing-rationale:${missing.join(',')}`);

  if (!['definition', 'attribute', 'contrast', 'scenario'].includes(row.yieldSource)) reasons.push('bad-yield-source');

  // Attachments, grounded the same way a quote is: the body must appear in the
  // cited section. Without that check a model can invent a "policy" it never saw
  // and the question becomes unanswerable in a way no reader can detect.
  const attachments = normalizeAttachments(row.attachments, section, reasons);
  row.attachments = attachments;

  // An exam item has to stand alone — or show what it needs. Both judges passed
  // a question that referred to "the L7 policy" without showing it, so this is
  // checked mechanically rather than trusted to a model's judgement.
  const wording = checkWording(row.stem, { hasAttachment: attachments.length > 0 });
  if (wording) reasons.push(wording);
  const optionWording = checkOptionWording(row.options, { hasAttachment: attachments.length > 0 });
  if (optionWording) reasons.push(optionWording);

  // A question whose stem and answer are the same text is degenerate.
  const answerText = row.options.find((o) => o.id === row.answer)?.text ?? '';
  if (answerText && row.stem.includes(answerText) && answerText.length > 20) reasons.push('answer-leaked-in-stem');

  if (reasons.length) return { reasons };
  return {
    ok: true,
    row: {
      stem: row.stem.trim(),
      options: row.options.slice(0, 5).map((o) => ({ id: o.id, text: String(o.text).trim() })),
      answer: row.answer,
      explanation: row.explanation.trim(),
      optionRationale: Object.fromEntries(
        wrongIds.map((id) => [id, String(rationale[id]).trim()]),
      ),
      yieldSource: row.yieldSource,
      ...(row.attachments?.length ? { attachments: row.attachments } : {}),
      citations: [
        {
          file: section.file,
          anchor: section.renderedAnchor,
          title: section.title,
          quote: row.quote.trim(),
          url: citationUrl(section.file, section.renderedAnchor),
        },
      ],
      provenance: {
        generator: {
          kind: 'llm',
          provider: safeHost(cfg.baseUrl),
          model,
          temperature: cfg.temperature,
        },
        docsRef: docs.ref,
        docsSha: null,
        sectionId: section.id,
        createdAt: null,
      },
    },
  };
}

async function main() {
  const data = JSON.parse(await readFile(SECTIONS, 'utf8'));
  const sources = await readJson(path.join(ROOT, 'data', 'sources.json'), {});
  const docsSha = sources?.docs?.sha ?? 'unknown';

  const cfg = generatorConfig();
  if (!cfg.configured) {
    log('gen-ai', `no credential in ${providers.generator.keyEnv}: generation skipped, writing empty candidate file`);
    await writeJsonl(OUT, []);
    return;
  }

  const templates = await readJsonl(TEMPLATES);
  const existing = await readJsonl(OUT);
  const existingBySection = new Map();
  // Highest ordinal already used per rendered anchor, taken from every candidate
  // rather than only the self-contained ones. Keyed by file+anchor — the tuple
  // stableId hashes — not by section.id. Short sections merged into a parent
  // heading share a rendered anchor, and keying by section.id let each of them
  // start its own ordinal sequence at 0, producing two questions with one id.
  const maxOrdinalByGroup = new Map();
  const countByGroup = new Map();
  // Templates count towards a section's yield as well. Without this the model
  // asks the same section for questions the template tier already produced, and
  // the verifier quarantines them as near-duplicates after paying for them.
  //
  // Only self-contained candidates count. A section that produced sixteen
  // questions all referring to "the excerpt" would otherwise be treated as
  // exhausted and never retried, which is the same mistake as counting
  // candidates rather than shipped questions for coverage.
  for (const r of [...templates, ...existing]) {
    const sid = r.provenance?.sectionId;
    if (!sid) continue;
    const c = r.citations?.[0];
    const group = c?.file && c?.anchor ? idKey(c.file, c.anchor) : sid;
    countByGroup.set(group, (countByGroup.get(group) ?? 0) + 1);
    const ordinal = Number.isInteger(r.ordinal) ? r.ordinal : null;
    if (ordinal !== null) {
      maxOrdinalByGroup.set(group, Math.max(maxOrdinalByGroup.get(group) ?? -1, ordinal));
    }
    if (checkWording(r.stem)) continue;
    if (!existingBySection.has(sid)) existingBySection.set(sid, []);
    existingBySection.get(sid).push(r);
  }
  // Where a group's ordinals are unknown (legacy rows carry none), fall back to
  // the number of candidates in the group, not any one section's count.
  for (const [group, n] of countByGroup) {
    if (!maxOrdinalByGroup.has(group)) maxOrdinalByGroup.set(group, n - 1);
  }

  // Ordinals are reserved per group for the whole run. Computing "max + 1 +
  // acceptedForSection" per section instead would hand two sections that share
  // a rendered anchor the same number.
  const nextOrdinalByGroup = new Map();
  function takeOrdinal(section) {
    const group = idKey(section.file, section.renderedAnchor ?? section.anchor);
    const next = nextOrdinalByGroup.get(group) ?? (maxOrdinalByGroup.get(group) ?? -1) + 1;
    nextOrdinalByGroup.set(group, next + 1);
    return next;
  }

  // Coverage so far, so we only generate where there is a deficit.
  //
  // This counts candidates that are already in the file, not candidates that
  // passed verification. The two diverge: a section asked for eight questions
  // may yield five that survive the gates, so treating the file count as
  // coverage makes the generator believe a domain is full while the corpus is
  // still short. The verifier's shipped count is the honest input when it is
  // available.
  const shipped = await readJson(path.join(ROOT, 'data', 'corpus.json'), { questions: [] });
  const useShipped = Array.isArray(shipped.questions) && shipped.questions.length > 0;
  const perDomain = {};
  for (const d of Object.keys(domains)) perDomain[d] = 0;
  if (useShipped) {
    for (const q of shipped.questions) perDomain[q.domain] = (perDomain[q.domain] ?? 0) + 1;
  } else {
    for (const r of [...templates, ...existing]) perDomain[r.domain] = (perDomain[r.domain] ?? 0) + 1;
  }

  const deficits = Object.fromEntries(
    Object.entries(domains).map(([d, meta]) => [d, Math.max(0, meta.floor - perDomain[d])]),
  );

  log('gen-ai', `deficits: ${JSON.stringify(deficits)}`);
  log('gen-ai', `model ${cfg.model} @ ${cfg.baseUrl}`);

  const usable = data.sections.filter(
    (s) => (s.renderStatus === 'verified' || s.renderStatus === 'verified-merged') && s.renderedAnchor && s.wordCount >= MIN_GEN_WORDS,
  );

/**
 * Blueprint-first ordering.
 *
 * The Cilium docs are three kinds of page: short overviews of a concept, long
 * reference chapters, and deep troubleshooting/migration guides. Sorting by
 * `wordCount` descending — which is what this used to do — fills the quota from
 * the longest pages, and in this documentation that means socket-level tracing,
 * DSR/IPIP edge cases and cloud-provider setup steps. Measured before this
 * change: 338 of 685 questions came from 30 sections, and 11 core overview pages
 * produced none.
 *
 * Order is now: blueprint pages first (the ones the official study guide links
 * to), then everything else, each group in document order. Within a domain the
 * round-robin below spreads the work so a partial run stays balanced.
 */
function blueprintRank(section) {
  const idx = blueprintFiles.indexOf(section.file);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

  // Round-robin across domains by remaining deficit.
  //
  // Sorting by deficit alone saturates one domain before touching the next,
  // which is visible in any partial run: an interrupted build has nothing at all
  // in half the domains. Interleaving means any prefix of the run is a usable,
  // balanced corpus.
  const byDomainSections = new Map();
  for (const s of usable) {
    if (!byDomainSections.has(s.domain)) byDomainSections.set(s.domain, []);
    byDomainSections.get(s.domain).push(s);
  }
  // Blueprint pages first, then document order. Never by size.
  for (const list of byDomainSections.values()) {
    list.sort((a, b) => {
      const ra = blueprintRank(a);
      const rb = blueprintRank(b);
      if (ra !== rb) return ra - rb;
      return a.id.localeCompare(b.id);
    });
  }

  const seen = new Set();
  const order = [];
  const domainsByDeficit = () =>
    [...byDomainSections.keys()].sort((a, b) => (deficits[b] ?? 0) - (deficits[a] ?? 0));
  const queues = new Map([...byDomainSections].map(([d, list]) => [d, [...list]]));
  while ([...queues.values()].some((q) => q.length)) {
    for (const d of domainsByDeficit()) {
      const q = queues.get(d);
      if (!q || !q.length) continue;
      const next = q.shift();
      if (!next || seen.has(next.id)) continue;
      seen.add(next.id);
      order.push(next);
    }
  }

  const rows = [...existing];
  let generated = 0;
  let considered = 0;
  const rejections = {};

  // Sections are independent, so they run concurrently. The default suits a
  // cloud endpoint; a single local GPU needs GEN_CONCURRENCY=4 or lower, or the
  // requests queue and start timing out.
  const CONCURRENCY = Number(process.env.GEN_CONCURRENCY ?? providers.generator.defaultConcurrency);

  const work = [];
  if (MANIFESTS_ONLY) {
    for (const section of order) {
      if (!/```(?:yaml|json)/.test(section.text)) continue;
      const have = existingBySection.get(section.id)?.length ?? 0;
      work.push({ section, need: Math.max(1, Math.min(PER_SECTION, PER_SECTION_CEILING) - have) });
    }
    log('gen-ai', `manifests-only: ${work.length} sections with a YAML or JSON block`);
  } else if (SECTION_FILTER) {
    for (const section of order) {
      if (!section.id.includes(SECTION_FILTER)) continue;
      const have = existingBySection.get(section.id)?.length ?? 0;
      work.push({ section, need: Math.max(1, Math.min(PER_SECTION, PER_SECTION_CEILING) - have) });
    }
    log('gen-ai', `targeted mode: ${work.length} sections matching "${SECTION_FILTER}"`);
  } else {
    const shippedFiles = new Set((shipped.questions ?? []).map((q) => q.citations?.[0]?.file).filter(Boolean));
    const backfilledFiles = new Set();
    for (const section of order) {
      const have = existingBySection.get(section.id)?.length ?? 0;
      const isStarvedBlueprint =
        blueprintFiles.includes(section.file) &&
        !shippedFiles.has(section.file) &&
        !backfilledFiles.has(section.file);
      if (isStarvedBlueprint) {
        const need = Math.max(1, Math.min(PER_SECTION, 3) - have);
        backfilledFiles.add(section.file);
        work.push({ section, need, blueprintBackfill: true });
        continue;
      }
      const domainDeficit = deficits[section.domain] ?? 0;
      if (domainDeficit <= 0) continue;
      const need = Math.min(Math.min(PER_SECTION, PER_SECTION_CEILING) - have, domainDeficit);
      if (need <= 0) continue;
      work.push({ section, need });
    }
  }

  let cursor = 0;
  let budgetLeft = LIMIT || Number.POSITIVE_INFINITY;

  async function worker() {
    while (cursor < work.length) {
      if (budgetLeft <= 0) return;
      const item = work[cursor];
      cursor += 1;
      const { section, need, blueprintBackfill } = item;
      if (!SECTION_FILTER && !MANIFESTS_ONLY && !blueprintBackfill && (deficits[section.domain] ?? 0) <= 0) continue;
      budgetLeft -= 1;
      considered += 1;

      let result;
      try {
        result = await generateForSection(section, need, cfg);
      } catch (err) {
        rejections['request-failed'] = (rejections['request-failed'] ?? 0) + 1;
        log('gen-ai', `section ${section.id} failed: ${err.message}`);
        continue;
      }
      if (result.rejected) {
        rejections[result.rejected] = (rejections[result.rejected] ?? 0) + 1;
        continue;
      }

      let acceptedForSection = 0;
      for (const raw of result.rows) {
        const v = validate(raw, section, result.model, cfg);
        if (!v.ok) {
          for (const reason of v.reasons) {
            const key = reason.split(':')[0];
            rejections[key] = (rejections[key] ?? 0) + 1;
          }
          continue;
        }
        v.row.provenance.docsSha = docsSha;
        const nextOrdinal = takeOrdinal(section);
        v.row.ordinal = nextOrdinal;
        v.row.id = stableId(section.file, section.renderedAnchor ?? section.anchor, nextOrdinal);
        v.row.domain = section.domain;
        v.row.competency = section.competency ?? null;
        v.row.type = 'single';
        v.row.schemaVersion = 1;
        rows.push(v.row);
        acceptedForSection += 1;
        generated += 1;
        if (!SECTION_FILTER && !MANIFESTS_ONLY) deficits[section.domain] -= 1;
      }
      if (acceptedForSection) {
        log('gen-ai', `${section.id}: +${acceptedForSection} (total ${rows.length})`);
        // Written incrementally so a long run that is interrupted still leaves
        // usable candidates behind rather than losing everything to one crash.
        if (rows.length % 5 === 0) await writeJsonl(OUT, rows);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await writeJsonl(OUT, rows);

  const coverage = {};
  for (const [d, meta] of Object.entries(domains)) {
    const count = rows.filter((r) => r.domain === d).length;
    coverage[d] = { count, floor: meta.floor, weight: meta.weight, met: count >= meta.floor };
  }
  const usage = getUsage();
  await writeJson(COVERAGE, {
    generatedAt: new Date().toISOString(),
    templates: templates.length,
    ai: rows.length,
    consideredSections: considered,
    usage,
    rejections,
    coverage,
  });

  log('gen-ai', `${generated} new candidates, ${rows.length} total in file`);
  log('gen-ai', `spent: ${usage.calls} calls, ${usage.promptTokens} prompt + ${usage.completionTokens} completion tokens`);
  log('gen-ai', `rejections: ${JSON.stringify(rejections)}`);
  for (const [d, c] of Object.entries(coverage)) {
    log('gen-ai', `  ${domains[d].label}: ${c.count}/${c.floor}${c.met ? '' : '  <-- short'}`);
  }
}

await main();
