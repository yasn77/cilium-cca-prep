/**
 * Minimal OpenAI-compatible chat client.
 *
 * Deliberately not a framework: the pipeline needs one call shape, a timeout,
 * retries on transient failures, and JSON extraction that survives a model
 * wrapping its answer in prose or a fence.
 */
import { providers } from './config.mjs';

export function generatorConfig() {
  const p = providers.generator;
  const apiKey = process.env[p.keyEnv];
  return {
    baseUrl: process.env[p.baseUrlEnv] || p.defaultBaseUrl,
    model: process.env[p.modelEnv] || p.defaultModel,
    apiKey,
    temperature: p.temperature,
    maxTokens: p.maxTokens,
    configured: Boolean(apiKey),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Running token totals for this process.
 *
 * Kept so a generation run can report what it consumed. A corpus build that
 * silently costs money is a build people stop running.
 */
const usageTotals = { calls: 0, promptTokens: 0, completionTokens: 0 };

export function getUsage() {
  return { ...usageTotals };
}

function recordUsage(usage) {
  usageTotals.calls += 1;
  usageTotals.promptTokens += usage.prompt_tokens ?? 0;
  usageTotals.completionTokens += usage.completion_tokens ?? 0;
}

/**
 * Pull a JSON object or array out of a model response.
 *
 * Models wrap JSON in fences, prepend "Here is the JSON:", or emit trailing
 * commentary. Rather than parse strictly and fail the whole candidate, find the
 * outermost balanced JSON value in the text.
 */
export function extractJson(text) {
  if (!text) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();

  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return null;

  const opener = s[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === opener) depth += 1;
    else if (ch === closer) {
      depth -= 1;
      if (depth === 0) {
        const candidate = s.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * One chat completion. Returns { text, usage, model } or throws.
 *
 * Retries on 429 and 5xx with exponential backoff, because a scheduled job that
 * dies on a transient upstream error is a scheduled job that never finishes.
 */
export async function chat(messages, { cfg, maxAttempts = 3, timeoutMs = 420000 } = {}) {
  const conf = cfg ?? generatorConfig();
  if (!conf.configured) throw new Error('generator provider has no API key');

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${conf.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${conf.apiKey}`,
        },
        body: JSON.stringify({
          model: conf.model,
          temperature: conf.temperature,
          max_tokens: conf.maxTokens,
          messages,
          // Supported by OpenAI and several compatible gateways; harmless where
          // it is ignored, and it makes reruns reproducible where it is not.
          seed: 20261107,
          // Reasoning models on OpenAI-compatible servers otherwise emit their
          // chain of thought as `reasoning_content` and can hit the token cap
          // before producing any JSON. Harmless on servers that ignore it.
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const bodyText = await res.text();
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        lastErr = new Error(`HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
        if (retryable && attempt < maxAttempts) {
          await sleep(1500 * attempt * attempt);
          continue;
        }
        throw lastErr;
      }
      const data = JSON.parse(bodyText);
      const text = data.choices?.[0]?.message?.content ?? '';
      const usage = data.usage ?? null;
      if (usage) recordUsage(usage);
      return { text, usage, model: data.model ?? conf.model };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < maxAttempts) {
        await sleep(1500 * attempt * attempt);
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr ?? new Error('chat failed');
}
