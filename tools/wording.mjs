/**
 * Wording checks for a self-contained question.
 *
 * An exam item has to stand alone. If the stem says "the rule" or "the L7
 * policy" and the reader has not been shown that rule, the question is only
 * answerable by whoever read the surrounding documentation page — which is not
 * what an exam item is.
 *
 * This is mechanical, so it belongs here rather than in a judge prompt. Both
 * judges passed a question of exactly this kind before this module existed:
 * "After the L7 policy is in place, an engineer runs ... and receives no
 * response. Why?" The answer is derivable from the quoted sentence, but only if
 * you already know there was an identity-aware rule with org=empire.
 */

/**
 * Nouns that are almost never bound without being shown.
 *
 * Deliberately short. "service", "gateway" and "deployment" are excluded: a stem
 * commonly names one ("a Service called payments") and then refers back to it,
 * which is correct writing, and including them made the check flag ordinary
 * questions.
 */
const OBJECT_NOUNS = [
  'rule', 'rules',
  'policy', 'policies',
  'manifest', 'manifest file',
  'yaml',
  'configuration', 'config',
  'excerpt', 'passage',
];

/**
 * A short modifier may sit between the determiner and the noun: "the L7 policy",
 * "the same rule", "the previous configuration".
 *
 * Matched structurally rather than as part of one big regex. Under the `i` flag
 * a character class like `[A-Z0-9]` matches lowercase too, so "the default
 * policy" was being read as "the <identifier> policy" and ordinary questions
 * were flagged. The modifier is therefore inspected separately: it is allowed
 * only if it is one of the listed words, or if it carries an uppercase letter or
 * a digit in the original text.
 */
const MODIFIER_WORDS = new Set(['same', 'above', 'below', 'previous', 'following', 'entire', 'whole']);

const NOUN_GROUP = OBJECT_NOUNS.map((n) => n.replace(/ /g, '\\s+')).join('|');

const REFERENCE_RE = new RegExp(
  `\\b(this|that|these|those|the)(?:\\s+([\\w./-]+))?\\s+(${NOUN_GROUP})\\b`,
  'gi',
);

/** Find the first unbound definite reference in a string, if any. */
function findUnboundReference(text) {
  REFERENCE_RE.lastIndex = 0;
  let m;
  while ((m = REFERENCE_RE.exec(text)) !== null) {
    const [whole, , modifier] = m;
    if (modifier === undefined) return whole;
    const lower = modifier.toLowerCase();
    if (MODIFIER_WORDS.has(lower)) return whole;
    if (/[A-Z0-9]/.test(modifier)) return whole;
    // A lowercase word that is not in the list means the determiner was
    // separate from the noun ("the cluster policy"? no: "the agent, policy…").
    // Keep scanning rather than rejecting on an incidental adjacency.
  }
  return null;
}

/** Direct references to the source material, which are meta rather than exam-like. */
const META_PATTERNS = [
  /\bthe excerpt\b/i,
  /\bthe passage\b/i,
  /\bthe (?:source )?text (?:above|below)\b/i,
  /\bas shown (?:above|below)\b/i,
  /\bshown (?:above|below)\b/i,
  /\bin the (?:above|previous) (?:step|section|example)\b/i,
  /\bthe (?:above|following) (?:step|output)\b/i,
  /\baccording to the (?:excerpt|passage|text|documentation|docs?)\b/i,
  /\baccording to the (?:verbose )?output\b/i,
  /\bthe output (?:above|below|shows)\b/i,
  /\bthe documentation (?:says|states)\b/i,
  /\bthe docs (?:say|state)\b/i,
];

/**
 * Does the stem bind the reference itself?
 *
 * A fenced block, a YAML body, a resource kind, or a name introduced in the stem
 * is enough: after "a CiliumNetworkPolicy selects pods with app=deathstar",
 * "the policy" is bound.
 */
function showsReferent(stem) {
  if (/```[\s\S]*```/.test(stem)) return true;
  if (/\bapiVersion\s*:/.test(stem)) return true;
  if (/\bkind\s*:\s*[A-Z]/.test(stem)) return true;
  if (/\{\s*"[^"]+"\s*:/.test(stem)) return true;
  // Any Cilium resource kind named anywhere in the stem binds "the policy" for
  // the purposes of this check. Plurals count: "CiliumNetworkPolicies" names it
  // as surely as the singular.
  if (/\bCilium[A-Za-z]*(?:Polic(?:y|ies)|Config|Pool|Node|Endpoint)/.test(stem)) return true;
  // "a Cilium Egress Gateway policy ... the policy": a multi-word Cilium
  // feature name with spaces still binds the reference.
  if (/\bCilium[\w\s-]{0,30}polic(?:y|ies)\b/i.test(stem)) return true;
  if (/\b(?:NetworkPolic(?:y|ies)|HTTPRoute|GRPCRoute|GatewayClass|CiliumBGP[A-Za-z]*)\b/.test(stem)) return true;
  return false;
}

/**
 * Returns a reason string when the stem cannot stand alone, otherwise null.
 */
export function checkWording(stem) {
  if (typeof stem !== 'string' || !stem.trim()) return 'stem-empty';

  // Meta references are wrong whatever else the stem contains: an exam item
  // should not talk about its own source.
  for (const re of META_PATTERNS) {
    if (re.test(stem)) return 'meta-reference-to-source';
  }

  const ref = findUnboundReference(stem);
  if (ref && !showsReferent(stem)) return `unbound-reference:${ref.toLowerCase()}`;

  return null;
}

/** Same check across every option, because a distractor can carry the reference. */
export function checkOptionWording(options) {
  for (const o of options ?? []) {
    const text = String(o.text ?? '');
    const ref = findUnboundReference(text);
    if (ref && !showsReferent(text)) return `option-unbound-reference:${o.id}:${ref.toLowerCase()}`;
  }
  return null;
}
