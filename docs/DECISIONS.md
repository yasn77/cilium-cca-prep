# Decisions

The record behind the design. Every entry states the decision, the reasoning,
and what it rules out — so that six months from now the question "why is it like
this?" has an answer that is not archaeology.

## Scope

### The corpus is built from the documentation, not from question banks

**Decision.** Generated from `github.com/cilium/cilium` `Documentation/` at a
pinned tag. No third-party question bank contributes to the practising corpus.

**Why.** Isovalent's launch post names the Cilium docs as *the primary reference
for the exam*, and the exam's own authors list the exact doc sections. Anchoring
to the same source is a checkable claim; copying a `braindump` is not, and the
banks we inspected contained provably wrong answers — one said Cilium implements
mTLS via IPsec, another gave `kubeProxyReplacement=strict` when the current docs
use `true`.

**Ruled out.** ExamTopics, FreeCram, DumpsCore, passitexams, Docsity, Stuvia,
Scribd. All either gate the content behind an account or sell a PDF we cannot
verify.

### The blind evaluation set is the one exception, and it is held out

**Decision.** 102 questions from the public CNCF practice-exam repository on
GitLab are shipped as `data/blind-set.json`, never shown in practice or exam
mode.

**Why.** A corpus graded only by its own generator measures the generator. A
score on independently written questions is the only signal that means anything,
and only if the questions were never practised against.

### The Isovalent study guide is not ingested

**Decision.** Excluded from the pipeline.

**Why.** It is CC BY-NC 4.0. The Cilium docs are CC BY 4.0, which permits this
redistribution with attribution; the study guide does not. Mixing them would put
a non-commercial constraint on the whole corpus.

## Generation

### Generation is per heading-anchored section, quota-driven

**Decision.** Sections from the rst heading hierarchy; quotas per domain derived
from the official weights.

**Why.** A 41 KB BGP page covers a dozen topics; one prompt over it produces
blur. And an unconstrained run converges on whatever is most quotable — policy
YAML and Hubble flags — starving eBPF and BGP, which is where associaate-level
candidates actually lose marks.

### Deterministic templates come first, the model second

**Decision.** `gen-templates.mjs` produces definition, attribute and contrast
questions with no model involved; `gen-ai.mjs` fills the remaining deficit.

**Why.** A template cannot hallucinate. Its output is also boring, which is why
it is capped low on purpose — 58 candidates against a 500 floor — and why the
scenario share is enforced separately.

### Every candidate must quote its source verbatim

**Decision.** The citation carries a `quote` that must appear character for
character in the cited section.

**Why.** It converts "trust the model" into a string comparison. It does not
prove the model read the passage correctly, which is why the report has a
*Known weak points* section rather than a clean bill of health.

## Verification

### Four gates, and the judge is not the truth gate

**Decision.** An item ships only if its anchor resolves, its quote is verbatim,
its answer is entailed by the citation, and the judge calls it a good exam item.

**Why.** SystemOne is a decision model: it returns a labelled choice and an
uncalibrated confidence, with no reasoning (its own documentation says so). It is
good at "is this a fair exam item?" and cannot be asked "is this fact true?".
A judge verdict never overrides a failed citation check.

### The judge is batched and its verdict never reaches the UI

**Decision.** 100 candidates per call; the verdict lives in `candidates/verdicts.json`,
not in `data/corpus.json`.

**Why.** Batching is nearly free in latency (measured: 100 questions ≈ 714 ms,
3 questions ≈ 712 ms). Showing a learner an uncalibrated confidence number would
imply precision the model does not have.

## Identity and state

### A question may carry the material it asks about

**Decision.** The data model has an optional `attachments` array holding a
manifest, command output, passage or diagram. An attachment body must appear in
the cited section.

**Why.** A question that says "after this policy is applied, why is the request
dropped?" is a real exam item — the CCA interface shows the policy. Rejecting
those as unanswerable threw away a whole legitimate question type. What is *not*
legitimate is a definite reference with nothing shown, so the rule is
"show it or do not refer to it", not "never refer to it".

**Ruled out.** Rejecting all definite references. That cost 251 questions and
removed exactly the kind of item the exam sets.

### `literalinclude` is resolved at ingest

**Decision.** The chunker pulls `.. literalinclude::` targets from the
repository's `examples/` directory into the section text.

**Why.** The docs keep policy YAML in separate files and pull it in at build
time. A section about an L7 policy therefore contained the prose and not the
policy, which is where the unanswerable question came from in the first place.
37 files use includes; 167 example manifests are now fetched.

### One answer per question

**Decision.** Single select only. No multi-select items.

**Why.** The Linux Foundation's multiple choice interface is documented at
`ExamUI: Multiple Choice Exams`, whose screenshot shows circular radio buttons —
one selection. There is no checkbox affordance for multiple answers. Multi-select
was ruled out on Q5 for validation reasons; this is the stronger reason.

### Question ids are not derived from question text

**Decision.** `sha256(file | anchor | ordinal)`, truncated to 16 hex characters.

**Why.** Regeneration rewrites wording on almost every run. An id that follows
the text discards the learner's history, wrong-answer list and flags every time
the corpus is refreshed.

### Progress is localStorage only

**Decision.** No account, no sync, no export beyond the flags file.

**Why.** Single user, two devices, offline-first. Sync would mean a backend and
an auth story for no benefit in a nine-day revision window.

## Infrastructure

### No build step for the app

**Decision.** Vanilla ES modules, no bundler, no framework.

**Why.** The workspace opened at `file://` has to work on the laptop, and a
build step is another thing that can rot. The only build is assembling `_site/`
in the Pages workflow.

### The ingest workflow opens a pull request rather than pushing

**Decision.** `.github/workflows/ingest.yml` writes to `corpus/refresh` and opens
a PR.

**Why.** The corpus is what the learner studies from. A scheduled job that
rewrites it silently is a job that will one day remove a hundred questions and
nobody will notice until the exam is tomorrow.

## Known discrepancy

`github.com/cncf/curriculum/blob/main/cca/README.md` lists **five** domains at
20% each. The Linux Foundation certification page (last modified 2026-07-27),
CNCF's CCA page, and Isovalent's launch post all list **eight** domains at
20/18/16/10/10/10/10/6.

This repo uses the eight-domain split. The curriculum README's last content
change was 2025-11-28 and it appears to be a stale draft. Weighted exam
simulation and domain floors both depend on this choice, so it is recorded here
rather than buried in `config.mjs`.
