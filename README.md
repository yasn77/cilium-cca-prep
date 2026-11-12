# Cilium CCA Prep

An offline practice app for the **Cilium Certified Associate** exam, and the
pipeline that builds its question corpus from the Cilium documentation.

Practice on a laptop in a browser, install it on an Android phone, and it keeps
working with no network. Every question cites the exact documentation section
that settles it, and every wrong answer explains why each option is wrong.

## Why this corpus and not a braindump

The Cilium docs are the primary reference for the exam, named as such by the
exam's own creators. This corpus is generated from the docs at a pinned commit,
and each question carries a citation that resolves to a real anchor on
`docs.cilium.io`.

That is weaker than "these are exam questions" and stronger than "these are
someone's recollection". It is also checkable: `data/report.md` lists every
candidate each gate rejected and why.

Third-party question banks are **not** used. The ones we inspected contained
provably wrong answers, and the rest are paywalled past the first page.

## What is in here

| Path | What it is |
|---|---|
| `app/` | The single-page app. No build step. |
| `data/corpus.json` | Shipped questions, each with citations and provenance |
| `data/quarantine.json` | Candidates that failed a gate, with the reason |
| `data/blind-set.json` | Held-out evaluation set, never shown in practice |
| `data/report.md` | Evidence: what was pulled, what was rejected, what is weak |
| `corpus/` | Pinned documentation snapshot and the section index |
| `tools/` | The pipeline |
| `docs/DECISIONS.md` | Why it is built this way |

## Running the app locally

```bash
node tools/serve.mjs        # http://localhost:8080
```

Or open `app/index.html` directly for everything except offline install, which
needs a real origin.

The committed corpus is enough to use the app immediately. Rebuilding it needs
Node 24 and network access.

## Live

<https://yasn77.github.io/cilium-cca-prep/>

## Installing on Android

Open the Pages URL in Chrome, then **⋮ → Add to Home screen**. It installs as a
standalone app and caches the corpus on first load. After that it works in
aeroplane mode.

## Rebuilding the corpus

```bash
npm run docs        # fetch the pinned Documentation/ at v1.20.4
npm run chunk       # split into heading-anchored sections
npm run anchors     # verify every anchor against the live site
npm run gen:templates
npm run gen:ai      # needs an API key
npm run judge       # needs a SystemOne-capable key
npm run verify
npm run report
npm run validate
```

Or the whole chain: `npm run pipeline`.

To compare candidate models on the real task rather than by price:

```bash
node tools/bench-models.mjs --sections 8
```

See `docs/MODEL-SELECTION.md` for the measurements and why the pinned model was
chosen.

### Environment

| Variable | Used by | Default |
|---|---|---|
| `LLM_API_KEY` | `gen-ai`, `judge` | — generation skipped without it |
| `LLM_BASE_URL` | `gen-ai` | `https://nano-gpt.com/api/v1` |
| `LLM_MODEL` | `gen-ai` | resolved per gateway, see below |
| `TYPESAFE_BASE_URL` | `judge` | `https://openrouter.ai/api/v1` |
| `TYPESAFE_MODEL` | `judge` | `jev-latest` |
| `JUDGE_API_KEY` | `judge`, `judge-llm` | falls back to `OPENROUTER_API_KEY`, then `LLM_API_KEY` |
| `JUDGE_MODEL` | `judge-llm` | `openai/gpt-5-nano` |
| `GEN_CONCURRENCY` | `gen-ai` | `8` |

### Gateways

Three gateways work and they name things differently. Setting `LLM_BASE_URL` or
`TYPESAFE_BASE_URL` selects the matching defaults:

| Gateway | Generator model | SystemOne judge |
|---|---|---|
| `https://openrouter.ai/api/v1` | `deepseek/deepseek-v4.1-flash-1017` | yes — `jev-latest` |
| `https://nano-gpt.com/api/v1` | `deepseek/deepseek-v4.1-flash-1017` | yes — `~typesafe/jev-latest` |
| `https://api.llmgateway.io/v1` | `deepseek-v4.1-flash-1017` | **no** — typed decisions refused on coding plans |

OpenRouter is the default for judging because it is not quota-bound like
nano-gpt's weekly allowance.

### Two judges

`judge` asks SystemOne whether each question is a fair exam item.
`judge-llm` asks a second model to answer each question blind from its own
citation; disagreement means the passage does not settle it. Both write verdicts
and `verify` merges them, taking the stricter and never letting an infrastructure
error count as approval.

Every variable is optional. A missing credential makes the corresponding stage a
no-op; the site still deploys with whatever corpus is committed, and the report
records that judging did not run.

## GitHub setup

```bash
./tools/bootstrap.sh --dry-run   # print what it will do
./tools/bootstrap.sh             # create the repo, push, set Pages and labels
```

Then add the secrets and variables yourself — the script deliberately does not
touch them:

```bash
# nano-gpt serves both the generator and SystemOne, so one key is enough.
gh secret set LLM_API_KEY
gh variable set LLM_BASE_URL    # https://nano-gpt.com/api/v1

# Optional: a different credential for judging.
gh secret set TYPESAFE_API_KEY
gh variable set TYPESAFE_BASE_URL
```

Pages requires a public repository on the free plan. Once the repo is public the
workflow publishes to `https://<owner>.github.io/cilium-cca-prep/`.

## Difficulty

Every question carries a SystemOne difficulty score from **1.0 to 5.0**, where
**3.0 is the real exam**. Practice and exam simulation have a slider that
defaults to the middle.

- **Left** — warm-up, foundational recall
- **Middle** — the real CCA exam
- **Right** — harder than the exam, for over-training the deep-dive material

Each question shows its score as a colour-coded badge, so a missed question can
be judged as a stretch item rather than a knowledge gap. Difficulty is a
calibration aid, not an official metric, and it never gates a question.

## What a question carries

A question has a stem, four or five options, one answer, an explanation, a
per-option rationale, and at least one citation. It may also carry
**attachments**: material the reader must see before answering.

That matters because the real exam shows the policy and then asks about it.
[`ExamUI: Multiple Choice Exams`](https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2/exam-user-interface/examui-multiple-choice-exams.md)
is the reference for the exam interface, and its screenshots show a conventional
item with room above the options.

```json
"attachments": [{
  "kind": "manifest",
  "title": "The policy under test",
  "language": "yaml",
  "body": "apiVersion: \"cilium.io/v2\"\nkind: CiliumNetworkPolicy\n..."
}]
```

| `kind` | Shows | Body required |
|---|---|---|
| `manifest` | YAML or JSON | yes |
| `output` | command output | yes |
| `text` | a prose passage | yes |
| `diagram` | an image | no, `src` instead |

An attachment body is grounded the same way a citation quote is: it must appear
in the cited section, so a model cannot invent a policy the docs never contain.

**Without an attachment, a stem may not refer to something it has not shown.**
"After the L7 policy is in place…" is unanswerable on its own; with the policy in
an attachment it is exactly right.

## How a question is verified

Five gates, all of which must pass:

1. **Anchor** — the cited section has an anchor verified against the live render.
   Guessing Sphinx's id algorithm is unreliable; `resolve-anchors.mjs` reads the
   rendered page instead.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's words appear in the cited section, and
   for a one-word answer at least one appears as a whole word. It deliberately
   does not try to prove the distractors wrong: a page listing three enforcement
   modes contains the vocabulary of all three, and judging distractors by word
   overlap threw away good questions about exactly those pages.
4. **Attachments** — any manifest or output shown must appear verbatim in the
   cited section.
5. **Judge** — SystemOne classifies it as `good_exam_item`, and a second model
   re-answers it blind and agrees. This gate is about fairness and answerability,
   not truth, and never overrides 1–4.

Whatever fails lands in `data/quarantine.json` with a machine-readable reason and
appears in the app's Review tab.

## Free courses to follow

`docs/RESOURCES.md` has a verified list: the three Cilium Week sessions, the
Isovalent CCA playlist, the free labs, and a nine-day plan. Every link was
checked for status and duration, and the ones that look free but are not
(KodeKloud's Pro-only course, the dead edX listing) are called out.

## The evaluation set

`data/blind-set.json` holds 102 questions from the public CNCF practice-exam
repository, held out from everything else. Take it twice: once as a baseline
before studying, once at the end. Retaking it in between turns a measurement
into practice.

## Licence

Code is MIT. The question corpus is derived from the Cilium documentation, which
is CC BY 4.0 — see `NOTICE`.

Not affiliated with CNCF, the Linux Foundation or Isovalent.
