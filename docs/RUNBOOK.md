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
question, and the corpus still builds.

`--allow-unjudged` exists for exactly this: it stops verify treating "not judged"
as a pass when you are running locally without a key. In CI the gate runs
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
