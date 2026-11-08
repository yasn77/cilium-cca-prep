/**
 * Entailment and grounding checks.
 *
 * Separated from verify.mjs so the rules can be tested directly rather than
 * through a subprocess and a temporary repository. Each function takes the data
 * it needs and returns a reason string or null, which keeps the failure messages
 * stable enough to count in the report.
 */
import { tokenise } from './lib.mjs';

/**
 * Does the correct option follow from the cited passage?
 *
 * The question this answers is narrow: is the marked answer *supported* by the
 * citation? It deliberately does not try to prove the distractors wrong, because
 * a passage that discusses several options — a page listing three enforcement
 * modes, say — contains the vocabulary of all of them, and judging distractors
 * by word overlap rejects perfectly good questions about exactly those pages.
 *
 * Grounding is therefore:
 *   - the answer's content words appear in the cited section, and
 *   - for short answers, at least one appears as a whole word, and no distractor
 *     contains all of them (otherwise the options are indistinguishable).
 *
 * What this cannot catch is a distractor that is also true. That is the judge's
 * job, and the reason the judge gate exists.
 */
export function checkEntailment(question, section) {
  if (!section) return { reason: 'section-missing' };

  const src = new Set(tokenise(section.text));
  const srcLower = section.text.toLowerCase();
  const hasWord = (w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(srcLower);

  const answer = question.options?.find((o) => o.id === question.answer);
  if (!answer) return { reason: 'answer-not-an-option' };

  const answerText = String(answer.text).toLowerCase();
  const answerTokens = tokenise(answerText);
  const contentWords = answerText
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  let answerHits;

  if (answerTokens.length < 3) {
    if (!contentWords.length) return { reason: 'answer-empty' };
    const allPresent = contentWords.every((w) => src.has(w));
    const wholeWord = contentWords.some(hasWord);
    if (!allPresent || !wholeWord) return { reason: 'answer-not-in-citation' };
    answerHits = 1;

    // A one-word answer contained in a distractor makes the options
    // indistinguishable from the source.
    const otherContains = (question.options ?? [])
      .filter((o) => o.id !== question.answer)
      .some((o) => contentWords.every((w) => String(o.text).toLowerCase().includes(w)));
    if (otherContains) return { reason: 'answer-appears-in-distractor' };
  } else {
    answerHits = answerTokens.filter((t) => src.has(t)).length / answerTokens.length;
    if (answerHits < 0.7) return { reason: `answer-not-in-citation:${answerHits.toFixed(2)}` };
  }

  return { ok: true, answerHits };
}
