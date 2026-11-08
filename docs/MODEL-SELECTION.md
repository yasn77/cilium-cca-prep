# Choosing a generator model

The model is not chosen by price per million tokens. A model that is twice as
cheap and three times likelier to mangle a verbatim quote is the more expensive
choice, because every rejected candidate costs the generation *and* inflates the
corpus that never ships.

`tools/bench-models.mjs` runs the real prompt over a fixed sample of sections and
counts what survives the real validators.

```bash
LLM_API_KEY=... node tools/bench-models.mjs --models a,b --sections 8
```

## How much context is actually needed

Measured over the 430 eligible sections:

| | Value |
|---|---|
| Excerpt, median | 1,611 chars ≈ 450 tokens |
| Excerpt, 90th percentile | 3,920 chars ≈ 1,090 tokens |
| Excerpt, largest | 11,788 chars ≈ 3,275 tokens |
| System prompt and scaffolding | ~445 tokens |
| Output for 5 questions | ~2,000 tokens (median 399 per question) |
| **Worst-case total** | **~5,700 tokens** |

So an 8K context is the floor, 16K is comfortable, and anything above 32K is
generous. This is a consequence of generating per section rather than per file:
one prompt over the whole 182k-word corpus would need 250k+ tokens.

## Is a small model enough

Probably, with two caveats. The task is a narrow transformation with a rigid
output shape — read a passage, write questions, quote verbatim, return JSON —
which is where small models do best. What degrades first is:

- **Verbatim quoting.** Mechanical, not intellectual. A small model paraphrases
  more, and `quote-not-in-source` rejects those. That costs throughput, not
  correctness.
- **Distractor plausibility.** The real quality axis, and what the judge's
  `distractors_too_obvious` category exists to catch.

The gates are the safety net: a weaker model produces more rejects, not worse
shipped questions.

## Results

Sample of 6–8 sections spanning all eight domains, 3 questions requested per
section, `temperature: 0`.

| Model | Gateway | Accepted | Scenario | s/section | Notes |
|---|---|---|---|---|---|
| `deepseek/deepseek-v4.1-flash-1017` | nano-gpt | **24/24 (100%)** | 33% | 7.0 | best overall |
| `deepseek/deepseek-v4.1-flash-1017-uncensored` | nano-gpt | 23/24 (96%) | 35% | 6.0 | marginally faster |
| `deepseek-v4.1-flash-1017` | llmgateway | 9/9 (100%) | 56% | 13.4 | slower, verbose reasoning |
| `gpt-5-nano` | nano-gpt | 15/18 (83%) | 47% | 6.6 | 3 quote-not-in-source |
| `deepseek/deepseek-v4-flash-0423` | nano-gpt | 6/12 (50%) | 100% | 6.1 | cheap, unreliable quotes |
| `minimax/minimax-m3.1-flash` | nano-gpt | 3/3 (100%) | 33% | 9.9 | too slow for its yield |
| `z-ai/glm-5.3-flash` | nano-gpt | 0/12 | — | 21.6 | 10k output tokens, never parsed |

Raw data: `data/model-benchmark.json`.

**Chosen:** `deepseek/deepseek-v4.1-flash-1017`, pinned in `tools/config.mjs`.

## The judge

SystemOne is available through nano-gpt as `~typesafe/jev-latest`. The direct
API at `api.typesafe.ai` uses `jev-latest`; the namespace differs, which the
client resolves from the configured base URL.

llmgateway refuses it: `permission_denied: Typed decisions are not available for
coding plans`. So a nano-gpt credential is required for the quality gate even if
generation runs elsewhere.

## Prompt sensitivity

The first run rejected 3 of 12 candidates as `bad-yield-source` because the
prompt named the four allowed values only in prose. Listing them as a literal
block fixed it and took the same model from 75% to 100% acceptance. The prompt is
part of the measurement: changing it invalidates the numbers above.
