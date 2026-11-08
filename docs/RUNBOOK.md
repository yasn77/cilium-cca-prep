# Runbook

## The corpus refresh PR looks wrong

Read `data/report.md` first — it lists every gate and what it rejected.

| Symptom | Likely cause | Action |
|---|---|---|
| Many `quote` rejections | the generator paraphrased instead of quoting | check the model; a weaker model quotes worse |
| Many `duplicate` rejections | the pool of distinct facts is exhausted | raise `perCompetencyMax`, or accept the ceiling |
| A whole domain vanished | a `domainRules` pattern stopped matching after a docs bump | check `corpus/sections.json` counts by domain |
| Everything `unmatched` in anchors | Sphinx changed its id scheme, or the site is down | check `data/anchor-check.json` |
| Judge histogram is all `wording_broken` | the model returned prose instead of JSON | inspect `candidates/ai.jsonl` |

## An anchor stops resolving

`resolve-anchors.mjs` reads the rendered page, so a section that disappears from
the site becomes `renderStatus: "unpublished"` and its questions quarantine on the
next run. That is the intended behaviour: a citation that goes nowhere is worse
than a missing question.

If the heading was merely renamed, the section still exists and will re-resolve
on the next run under its new anchor — but the question's stable id changes,
because the id is `file | anchor | ordinal`. Expect that question's history to
look orphaned under Review.

## The judge is down

SystemOne unreachable means `judge.mjs` writes an empty verdict file and logs the
error. `verify.mjs` then records `judgeVerdict: "not-configured"` on every
question, the corpus still builds, and the app's home screen says plainly that
quality judging has not run.

Two distinct causes are worth telling apart:

| Message | Cause |
|---|---|
| `authentication_error` | the key is wrong, or the provider does not carry SystemOne |
| `rate_limit_error: Weekly included input token limit exceeded` | nano-gpt's plan quota is spent; it does not allow overage by default |

llmgateway answers `permission_denied: Typed decisions are not available for
coding plans` — that plan cannot judge at all, whatever is left on it. Point
`TYPESAFE_BASE_URL` at a gateway that serves `jev-latest` or accept an un-judged
corpus.

`--allow-unjudged` exists for local runs without a key; in CI the gate runs
automatically whenever verdicts are present.

## A question is wrong

In the app: **☆** on the question, then Review → Export flags. That gives you
`flags.json`.

Drop it into `overrides/` and add the fix:

```json
{
  "0f138c18557ce81d": {
    "answer": "b",
    "explanation": "Corrected explanation…"
  }
}
```

An override that targets an id no longer in the corpus **fails the build** rather
than being ignored, so dead patches surface instead of rotting.

To pull a question entirely, add its id to `data/retired.json`.

## A domain is short

The floor check fails the build with a per-domain table. Options:

1. Generate more: raise `per-section`, or lower `quota.scenarioMinShare` if the
   scenario restriction is what is starving that domain.
2. Accept it: pass `--enforce-floor` off in the ingest workflow for one run, and
   the report will show the shortfall in bold.

Do not lower the floors in `config.mjs` to make a build pass. They are derived
from the official weights, and a corpus that does not cover a 10% domain is a
corpus that will let you fail that domain.

## Running the pipeline

There is no schedule. Every run is a `workflow_dispatch`:

```bash
# Exercise the real path without spending much: a few sections, manifests only
gh workflow run ingest.yml -f per_section=4 -f limit=4 -f manifests_only=true

# Top up a domain that is short
gh workflow run ingest.yml -f per_section=8

# Full refresh: every candidate, about 20 minutes
gh workflow run ingest.yml
```

`manifests_only` ignores the coverage deficits and generates from the 109
sections that contain a YAML or JSON block, which is what you want once the
floors are met and you are adding attachment-bearing questions rather than
volume.

## Regenerating from a different docs version

```bash
gh workflow run ingest.yml -f bump_ref=v1.21.0
```

Then read the PR. Every citation is against the old tag until this lands, so the
diff will be large: questions whose section moved will appear as removed and
re-added with new ids.

## The app shows an empty corpus

`data/corpus.json` has no questions and the Pages workflow refuses to publish it.
Run the pipeline locally, or dispatch the ingest workflow, and merge the PR.

## Offline install fails on Android

Chrome only offers **Add to Home screen** as an install on HTTPS or localhost.
A Pages URL is HTTPS, so this works; opening the files over `file://` does not.

If the offline dot in the top bar stays grey after a first visit, the service
worker did not register. Open the console: registration failures are logged as
`[cca-prep] service worker registration failed: …` rather than swallowed, because
a silent failure leaves you believing the app works on a plane when it does not.

## Pages will not enable

GitHub Pages needs either a public repository or a paid plan for private ones.
`gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow` answers
`422 Your current plan does not support GitHub Pages for this repository` while
the repository is private. Make it public, then re-run that command.
