/**
 * Combining judge verdicts.
 *
 * Two judges can run over the same corpus and they disagree in interesting
 * ways, so the merge rules are explicit rather than incidental.
 */

/**
 * Combine two verdict maps.
 *
 * Rules, in order:
 *   1. An `error` verdict is not an opinion. It never displaces a real verdict
 *      and never counts as approval. Losing a SystemOne defect to the other
 *      judge's infrastructure failure would ship a question both judges would
 *      have rejected — which is exactly what happened when this was written the
 *      naive way and let 134 known-bad questions through.
 *   2. When both return a real verdict, the stricter wins. A question one judge
 *      calls ambiguous should not ship on the other's approval.
 *   3. When only one returns a real verdict, that one decides.
 */
export function mergeVerdicts(primary, secondary) {
  const merged = {};
  const ids = new Set([...Object.keys(primary ?? {}), ...Object.keys(secondary ?? {})]);
  for (const id of ids) {
    const a = primary?.[id];
    const b = secondary?.[id];
    const real = [a, b].filter((v) => v && v.choice && v.choice !== 'error');

    if (!real.length) {
      merged[id] = { choice: 'error', detail: 'no judge returned a verdict' };
      continue;
    }
    const difficultyFields =
      typeof a?.difficulty === 'number'
        ? { difficulty: a.difficulty, ...(a.difficultyDistribution ? { difficultyDistribution: a.difficultyDistribution } : {}) }
        : typeof b?.difficulty === 'number'
          ? { difficulty: b.difficulty, ...(b.difficultyDistribution ? { difficultyDistribution: b.difficultyDistribution } : {}) }
          : {};
    if (real.length === 1) {
      merged[id] = { ...real[0], ...difficultyFields };
      continue;
    }
    const strict = real.find((v) => v.choice !== 'good_exam_item');
    merged[id] = strict
      ? { ...strict, ...difficultyFields, also: real.filter((v) => v !== strict).map((v) => v.choice) }
      : { ...real[0], ...difficultyFields };
  }
  return merged;
}

/** Which judge produced the verdicts that shipped, for the app and the report. */
export function judgeSource(primary, secondary) {
  const hasPrimary = Boolean(primary && Object.keys(primary).length);
  const hasSecondary = Boolean(secondary && Object.keys(secondary).length);
  if (hasPrimary && hasSecondary) return 'systemone+adversarial';
  if (hasPrimary) return 'systemone';
  if (hasSecondary) return 'adversarial';
  return null;
}
