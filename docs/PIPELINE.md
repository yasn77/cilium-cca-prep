# Pipeline

How a sentence in the Cilium docs becomes a question in the app, and where each
step can refuse to continue.

```
cilium/cilium@v1.20.4
  Documentation/**/*.rst
        │  tools/fetch-docs.mjs        tarball for the tag, filtered to blueprint paths
        ▼
  corpus/docs/                          git-ignored, reproducible
        │  tools/chunk-rst.mjs          heading hierarchy → sections
        ▼
  corpus/sections.json                  ~1,100 sections, domain-mapped
        │  tools/resolve-anchors.mjs    rendered pages → verified anchors
        ▼
  corpus/sections.json + anchors        anchor, or renderStatus: unpublished
        │
        ├── tools/gen-templates.mjs  ──►  candidates/templates.jsonl   (no model)
        └── tools/gen-ai.mjs         ──►  candidates/ai.jsonl          (needs LLM_API_KEY)
                    │
                    │  tools/judge.mjs ──► candidates/verdicts.json   (needs SystemOne key)
                    ▼
        tools/verify.mjs             four gates; nothing passes silently
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
  data/corpus.json         data/quarantine.json
        │                        │
        │  tools/report.mjs       │
        ▼                        ▼
  data/report.md  ────────────────────────►  the app's Review tab
        │
        ▼
  .github/workflows/pages.yml  →  GitHub Pages
```

## Where it can stop

| Stage | Stops when | Effect |
|---|---|---|
| `fetch-docs` | the tarball and the `_sources` fallback both fail | hard failure, no corpus change |
| `chunk-rst` | never — it reports drops instead | sections shrink, generation shrinks |
| `resolve-anchors` | never — unmatched anchors are marked | those sections are un-citable, so un-shippable |
| `gen-templates` | never | may produce few candidates, which the floor check catches |
| `gen-ai` | no `LLM_API_KEY` | logs and exits 0 — deploy continues |
| `judge` | no key, or the API errors | writes an empty verdict file, logs, exits 0 |
| `verify` | overrides target missing ids, or `--enforce-floor` unmet | non-zero exit in CI |
| `validate` | any schema problem | the Pages workflow refuses to publish |

The asymmetry is deliberate. Generation and judging are best-effort so a missing
credential cannot block a deploy. Verification and validation are strict so a
broken corpus cannot ship.

## Adding documentation

`tools/config.mjs` holds every knob:

- `docs.ref` — the pinned tag. Changing it invalidates every citation, so it is a
  deliberate commit and the ingest workflow can bump it as an input.
- `includePaths` / `excludePaths` — which parts of `Documentation/` are in scope.
- `domainRules` — path (and optionally heading) patterns to exam domain, in
  priority order. A section matching no rule is dropped and counted.
- `competencyRules` — heading patterns to competency within a domain.
- `domains` — weights and per-domain floors.
- `quota` — per-competency bounds, scenario share, corpus floor.

Section-to-domain mapping is explicit because the blueprint's competency names do
not appear verbatim in the docs. Guessing produces a coverage report that lies.

## Why per-section generation

A 41 KB BGP configuration page covers a dozen distinct topics. One prompt over it
produces generalities; one prompt per section produces a question anchored to a
passage narrow enough to quote.

## Why the quotes are verbatim

The `quote` field is the whole grounding argument. It is checked as a substring
of the cited section, after whitespace and markup normalisation. That turns "the
model says so" into a string comparison a build can run.

It does not prove the model interpreted the passage correctly — only that the
words it cited are really there. Anything the gates cannot adjudicate is listed
under **Known weak points** in the report.
