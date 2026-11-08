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
 * Not semantics: it asks whether the answer option shares distinctive words with
 * the passage while the distractors do not. A question whose answer shares
 * nothing with its own citation is not grounded in that citation, whatever its
 * explanation claims.
 *
 * Short answers need different treatment. "socket", "default" and "always" are
 * perfectly good options in a Cilium exam, and a token-overlap ratio over two
 * words is meaningless. For those, every content word must appear in the cited
 * section and at least one must appear as a whole word — "map" must not be
 * satisfied by "mapping".
 */
export function checkEntailment(question, section) {
  if (!section) return { reason: 'section-missing' };

  const src = new Set(tokenise(section.text));
  const srcLower = section.text.toLowerCase();

  const answer = question.options?.find((o) => o.id === question.answer);
  if (!answer) return { reason: 'answer-not-an-option' };

  const answerText = String(answer.text).toLowerCase();
  const answerTokens = tokenise(answerText);
  const contentWords = answerText
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const distractorHits = (question.options ?? [])
    .filter((o) => o.id !== question.answer)
    .map((o) => {
      const toks = tokenise(o.text);
      if (!toks.length) return 0;
      return toks.filter((t) => src.has(t)).length / toks.length;
    });

  let answerHits;

  if (answerTokens.length < 3) {
    if (!contentWords.length) return { reason: 'answer-empty' };
    const allPresent = contentWords.every((w) => src.has(w));
    const wholeWord = contentWords.some((w) =>
      new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(srcLower),
    );
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

  // Every distractor fully present in the same passage means the question is
  // answerable by copying, or the passage states both sides.
  if (distractorHits.every((d) => d > 0.85)) return { reason: 'all-options-in-citation' };

  return { ok: true, answerHits, distractorHits };
}
