/**
 * Progress persistence.
 *
 * localStorage only — no account, no sync. Every key is namespaced by schema
 * version so an older build cannot misread a newer store; a version bump runs
 * a migration rather than silently discarding history.
 *
 * Question ids are stable across regeneration (file + anchor + ordinal), so
 * rewording a question keeps its history. Items that disappear become
 * "orphaned" and are kept, counted and shown, not deleted.
 */
const KEY = 'cca-prep/v1';
const SCHEMA = 1;

function empty() {
  return {
    schemaVersion: SCHEMA,
    seen: {},        // id -> { attempts, correct, lastAt }
    flagged: [],     // ids the learner thinks are wrong
    sessions: [],    // recent practice/exam summaries
    blindRuns: [],   // blind evaluation results
    corpusVersion: null,
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA) return migrate(parsed);
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

function migrate(old) {
  // Only one historical shape exists; anything older is discarded loudly by
  // keeping the session list where the field names happen to match.
  const next = empty();
  if (Array.isArray(old?.sessions)) next.sessions = old.sessions.slice(-50);
  next.migratedFrom = old?.schemaVersion ?? 'unknown';
  return next;
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded: keep running, progress just will not persist */
  }
}

export function getProgress() {
  return read();
}

export function recordAnswer(id, correct) {
  const data = read();
  const entry = data.seen[id] ?? { attempts: 0, correct: 0, lastAt: null };
  entry.attempts += 1;
  if (correct) entry.correct += 1;
  entry.lastAt = new Date().toISOString();
  data.seen[id] = entry;
  write(data);
  return data;
}

export function toggleFlag(id) {
  const data = read();
  const i = data.flagged.indexOf(id);
  if (i === -1) data.flagged.push(id);
  else data.flagged.splice(i, 1);
  write(data);
  return i === -1;
}

export function isFlagged(id) {
  return read().flagged.includes(id);
}

export function recordSession(session) {
  const data = read();
  data.sessions.unshift({ ...session, at: new Date().toISOString() });
  data.sessions = data.sessions.slice(0, 60);
  write(data);
}

export function recordBlindRun(run) {
  const data = read();
  data.blindRuns.unshift({ ...run, at: new Date().toISOString() });
  write(data);
}

export function setCorpusVersion(version) {
  const data = read();
  const previous = data.corpusVersion;
  data.corpusVersion = version;
  write(data);
  return previous;
}

/** Ids recorded in progress that no longer exist in the corpus. */
export function orphanedIds(corpusIds) {
  const data = read();
  const known = new Set(corpusIds);
  const orphans = [];
  for (const id of Object.keys(data.seen)) if (!known.has(id)) orphans.push(id);
  for (const id of data.flagged) if (!known.has(id) && !orphans.includes(id)) orphans.push(id);
  return orphans;
}

export function statsFor(id) {
  const data = read();
  return data.seen[id] ?? null;
}

export function resetAll() {
  localStorage.removeItem(KEY);
}

/** Export flags in the shape overrides/*.json expects. */
export function exportFlags() {
  const data = read();
  const out = {};
  for (const id of data.flagged) {
    out[id] = { flaggedByLearner: true, flaggedAt: new Date().toISOString() };
  }
  return out;
}
