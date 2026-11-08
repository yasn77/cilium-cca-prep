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
npm run gen:ai      # needs LLM_API_KEY
npm run judge       # needs TYPESAFE_API_KEY (falls back to LLM_API_KEY)
npm run verify
npm run report
npm run validate
```

Or the whole chain: `npm run pipeline`.

### Environment

| Variable | Used by | Required |
|---|---|---|
| `LLM_API_KEY` | `gen-ai`, `judge` | No — generation is skipped without it |
| `LLM_BASE_URL` | `gen-ai` | No — defaults to OpenAI |
| `LLM_MODEL` | `gen-ai` | No — defaults to a pinned model in `tools/config.mjs` |
| `TYPESAFE_API_KEY` | `judge` | No — falls back to `LLM_API_KEY` |
| `TYPESAFE_BASE_URL` | `judge` | No — defaults to `api.typesafe.ai` |
| `GEN_CONCURRENCY` | `gen-ai` | No — defaults to 4 |

Every one is optional. A missing credential makes the corresponding stage a
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
gh secret set LLM_API_KEY
gh secret set TYPESAFE_API_KEY
gh variable set LLM_BASE_URL
gh variable set LLM_MODEL
gh variable set TYPESAFE_BASE_URL
```

## How a question is verified

Four gates, all of which must pass:

1. **Anchor** — the cited section has an anchor verified against the live render.
   Guessing Sphinx's id algorithm is unreliable; `resolve-anchors.mjs` reads the
   rendered page instead.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited
   section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classifies it as `good_exam_item`. This gate is about
   fairness, not truth, and never overrides 1–3.

Whatever fails lands in `data/quarantine.json` with a machine-readable reason and
appears in the app's Review tab.

## The evaluation set

`data/blind-set.json` holds 102 questions from the public CNCF practice-exam
repository, held out from everything else. Take it twice: once as a baseline
before studying, once at the end. Retaking it in between turns a measurement
into practice.

## Licence

Code is MIT. The question corpus is derived from the Cilium documentation, which
is CC BY 4.0 — see `NOTICE`.

Not affiliated with CNCF, the Linux Foundation or Isovalent.
