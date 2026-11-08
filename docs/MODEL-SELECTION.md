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

Two judges exist and they check different things.

**SystemOne (`jev-latest`)** is a decision model: it returns a labelled choice
over defect categories with a probability distribution, and no reasoning. It is
good at "is this a fair exam item?" and cannot be asked "is this fact true?".

It is served by three gateways, which name it differently:

| Gateway | `TYPESAFE_BASE_URL` | Model id |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` | `jev-latest` (mapped to `typesafe/jev-1.14-…`) |
| nano-gpt | `https://nano-gpt.com/api/v1` | `~typesafe/jev-latest` |
| TypeSafe direct | `https://api.typesafe.ai` | `jev-latest` |

OpenRouter is the default. It also needs the path handled carefully: its base URL
already ends in `/v1`, so `/v1/systemone` must not be appended twice.

llmgateway **cannot** judge: `permission_denied: Typed decisions are not
available for coding plans`.

**Adversarial re-answer (`tools/judge-llm.mjs`)** is the second judge. A model
from a different family is given only the citation and the options, and answers
blind. Disagreement means the passage does not settle the question; two
defensible options means the distractor set is broken. This is the check that
catches what a fairness rating cannot.

### Merging the two

An `error` verdict is not an opinion, so it never displaces a real verdict and
never counts as approval. When both judges give a real verdict, the stricter one
wins.

That rule is not theoretical. The first implementation let the adversarial
judge's infrastructure error overwrite SystemOne's defect verdicts, and 134
questions that SystemOne had explicitly rejected shipped to the site. The symptom
was a low judge-rejection count next to a high defect histogram, which is only
visible if you cross-check the two.

### Results on this corpus

892 candidates, judged by both:

| Verdict | SystemOne | Adversarial |
|---|---|---|
| `good_exam_item` | 679 | 798 |
| `error` (not an opinion) | 0 | 88 |
| `trivia_not_in_blueprint` | 86 | — |
| `answer_not_determinable` | 57 | 6 |
| `wording_broken` | 40 | — |
| `distractors_too_obvious` | 28 | — |
| `ambiguity_two_correct` | 2 | — |

SystemOne is the harsher judge: it rejects 213 of 892, mostly for trivia and
broken wording, which the adversarial check cannot see because it only tests
whether the answer is derivable.

### Reasoning control is per model

The generator must not think before answering: through OpenRouter it spent the
entire 3,000-token budget and returned nothing parseable on every call. Disabling
reasoning took that to 8 tokens and valid JSON.

The judging model is the opposite — `openai/gpt-5-nano` answers `400 Reasoning is
mandatory for this endpoint and cannot be disabled`. So the field is per-provider,
and the client drops it automatically and retries when an endpoint refuses it.

Cost per SystemOne call: about $0.0000146.

## Prompt sensitivity

The first run rejected 3 of 12 candidates as `bad-yield-source` because the
prompt named the four allowed values only in prose. Listing them as a literal
block fixed it and took the same model from 75% to 100% acceptance. The prompt is
part of the measurement: changing it invalidates the numbers above.
