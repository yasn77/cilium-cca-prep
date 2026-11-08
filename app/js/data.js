/**
 * Corpus loading, filtering and per-domain scoring.
 */
const state = {
  corpus: null,
  quarantine: null,
  blind: null,
  guide: null,
  loadedAt: null,
};

export const DOMAINS = {
  architecture: { label: 'Architecture', weight: 20 },
  'network-policy': { label: 'Network Policy', weight: 18 },
  'service-mesh': { label: 'Service Mesh', weight: 16 },
  observability: { label: 'Network Observability', weight: 10 },
  installation: { label: 'Installation and Configuration', weight: 10 },
  'cluster-mesh': { label: 'Cluster Mesh', weight: 10 },
  ebpf: { label: 'eBPF', weight: 10 },
  bgp: { label: 'BGP and External Networking', weight: 6 },
};

export const DOMAIN_ORDER = Object.keys(DOMAINS);

const BASE = new URL('../', import.meta.url);

async function getJson(name) {
  const res = await fetch(new URL(`data/${name}`, BASE), { cache: 'no-cache' });
  if (!res.ok) return null;
  return res.json();
}

export async function load() {
  const [corpus, quarantine, blind, guide] = await Promise.all([
    getJson('corpus.json'),
    getJson('quarantine.json'),
    getJson('blind-set.json'),
    getJson('guide.json'),
  ]);
  state.corpus = corpus;
  state.quarantine = quarantine;
  state.blind = blind;
  state.guide = guide;
  state.loadedAt = new Date();
  return state;
}

export function getState() {
  return state;
}

export function questions() {
  return state.corpus?.questions ?? [];
}

export function corpusMeta() {
  const c = state.corpus;
  return {
    total: c?.questions?.length ?? 0,
    docsRef: c?.docsRef ?? '—',
    docsSha: c?.docsSha ?? '—',
    generatedAt: c?.generatedAt ?? null,
    counts: c?.counts ?? null,
    schemaVersion: c?.schemaVersion ?? null,
  };
}

export function blindSet() {
  return state.blind?.questions ?? [];
}

/** Blind questions in the shape the app renders: options carry ids. */
export function displayBlindSet() {
  return blindSet().map((q) => ({
    ...q,
    options: (q.options ?? []).map((o, i) =>
      typeof o === 'string' ? { id: String.fromCharCode(97 + i), text: o } : o,
    ),
    answer:
      typeof q.answer === 'number'
        ? String.fromCharCode(97 + q.answer)
        : typeof q.answer === 'string' && /^[0-4]$/.test(q.answer)
          ? String.fromCharCode(97 + Number(q.answer))
          : q.answer,
  }));
}

export function countByDomain(list = questions()) {
  const out = Object.fromEntries(DOMAIN_ORDER.map((d) => [d, 0]));
  for (const q of list) if (out[q.domain] !== undefined) out[q.domain] += 1;
  return out;
}

/**
 * Draw a 60-question paper proportional to the official weights.
 *
 * Uses largest-remainder so the counts sum to exactly 60 rather than 59 or 61,
 * and tops up from whatever domains still have spare questions when a domain
 * cannot meet its quota.
 */
export function buildExamPaper(pool = questions(), size = 60) {
  const byDomain = Object.fromEntries(DOMAIN_ORDER.map((d) => [d, []]));
  for (const q of pool) if (byDomain[q.domain]) byDomain[q.domain].push(q);

  const totalWeight = DOMAIN_ORDER.reduce((a, d) => a + DOMAINS[d].weight, 0);
  const exact = DOMAIN_ORDER.map((d) => ({ d, v: (DOMAINS[d].weight / totalWeight) * size }));
  const quota = Object.fromEntries(exact.map(({ d, v }) => [d, Math.floor(v)]));
  let assigned = Object.values(quota).reduce((a, b) => a + b, 0);
  const remainders = exact
    .map(({ d, v }) => ({ d, r: v - Math.floor(v) }))
    .sort((a, b) => b.r - a.r);
  for (const { d } of remainders) {
    if (assigned >= size) break;
    quota[d] += 1;
    assigned += 1;
  }

  const paper = [];
  const shortfall = {};
  for (const d of DOMAIN_ORDER) {
    const want = quota[d];
    const have = shuffle(byDomain[d]).slice(0, want);
    paper.push(...have);
    if (have.length < want) shortfall[d] = want - have.length;
  }

  // Top up any shortfall from domains with spare questions.
  let missing = Object.values(shortfall).reduce((a, b) => a + b, 0);
  if (missing > 0) {
    const used = new Set(paper.map((q) => q.id));
    const spare = shuffle(pool.filter((q) => !used.has(q.id)));
    for (const q of spare) {
      if (missing <= 0) break;
      paper.push(q);
      missing -= 1;
    }
  }

  return { paper: shuffle(paper), shortfall, quota };
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Percentage scored per domain, for the results screen. */
export function domainBreakdown(answers, paper) {
  const out = {};
  for (const d of DOMAIN_ORDER) {
    const inDomain = paper.filter((q) => q.domain === d);
    if (!inDomain.length) continue;
    const right = inDomain.filter((q) => answers[q.id] === q.answer).length;
    out[d] = {
      total: inDomain.length,
      right,
      pct: Math.round((right / inDomain.length) * 100),
    };
  }
  return out;
}

export const PASS_MARK = 75;
