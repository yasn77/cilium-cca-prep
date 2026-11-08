/**
 * Attachment checks.
 *
 * An attachment is material the question depends on and the reader must see: a
 * manifest, command output, a prose passage or a diagram. It is what makes a
 * question like "after this policy is applied, why is the request dropped?"
 * legitimate, because the CCA exam UI shows the policy alongside the item.
 *
 * The grounding rule is the same as for a citation quote: a body must appear in
 * the cited section. A model that invents a policy the documentation never
 * contains produces a question nobody can answer, and the failure is invisible
 * to a reader — the manifest looks plausible.
 */
import { quotePresent } from './lib.mjs';

const KINDS = new Set(['manifest', 'output', 'text', 'diagram']);

/**
 * @param {object} question  the candidate
 * @param {object|null} section  the cited section, or null when missing
 * @returns {string|null} a reason when invalid
 */
export function checkAttachments(question, section) {
  const list = question.attachments;
  if (list === undefined) return null;
  if (!Array.isArray(list)) return 'attachments-not-array';
  if (list.length > 2) return 'too-many-attachments';

  for (const [i, a] of list.entries()) {
    if (!a || typeof a !== 'object') return `attachment ${i} not an object`;
    if (!KINDS.has(a.kind)) return `attachment ${i} bad kind: ${a.kind}`;
    if (typeof a.title !== 'string' || a.title.trim().length < 3) {
      return `attachment ${i} title too short`;
    }

    // A diagram references an image rather than carrying text. None are
    // generated yet, so the only requirement is that it declares itself.
    if (a.kind === 'diagram') continue;

    if (typeof a.body !== 'string' || a.body.trim().length < 10) {
      return `attachment ${i} body too short`;
    }
    if (!section) return `attachment ${i} has no section to check against`;
    if (!quotePresent(a.body, section.text)) return `attachment ${i} not in cited section`;
  }

  return null;
}
