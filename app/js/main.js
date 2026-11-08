/**
 * Boot, routing and the home screen.
 *
 * Hash routing keeps it working from a plain static host and from file://,
 * which matters because the laptop copy may be opened straight off disk.
 */
import {
  load,
  getState,
  questions,
  corpusMeta,
  countByDomain,
  DOMAINS,
  DOMAIN_ORDER,
  PASS_MARK,
} from './data.js';
import { getProgress, setCorpusVersion, orphanedIds } from './progress.js';
import { el, fill } from './ui.js';
import * as practice from './practice.js';
import * as exam from './exam.js';
import * as blind from './blind.js';
import * as review from './review.js';
import * as guide from './guide.js';

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

const ROUTES = {
  home: { label: 'Home', icon: '⌂', render: renderHome },
  learn: { label: 'Learn', icon: '▶', render: guide.start },
  practice: { label: 'Practice', icon: '✎', render: practice.start },
  exam: { label: 'Exam', icon: '◱', render: exam.start },
  blind: { label: 'Blind', icon: '◎', render: blind.start },
  review: { label: 'Review', icon: '⚖', render: review.start },
};

function renderTabs(active) {
  fill(tabbar, [
    ...Object.entries(ROUTES).map(([key, r]) =>
      el(
        'a',
        {
          href: `#/${key}`,
          'aria-current': key === active ? 'page' : null,
        },
        [el('span', { class: 'tab-icon', text: r.icon }), el('span', { text: r.label })],
      ),
    ),
  ]);
}

function route() {
  const key = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const entry = ROUTES[key] ? key : 'home';
  renderTabs(entry);
  ROUTES[entry].render(app);
}

function statCard(value, label, tone) {
  return el('div', { class: 'stat' }, [
    el('div', { class: 'stat-value', style: tone ? `color:${tone}` : '', text: String(value) }),
    el('div', { class: 'stat-label', text: label }),
  ]);
}

function renderHome(root) {
  const state = getState();
  const meta = corpusMeta();
  const list = questions();
  const byDomain = countByDomain(list);
  const progress = getProgress();
  const seenIds = Object.keys(progress.seen);
  const attempted = seenIds.length;
  const correctTotal = seenIds.reduce((a, id) => a + (progress.seen[id].correct ?? 0), 0);
  const attemptsTotal = seenIds.reduce((a, id) => a + (progress.seen[id].attempts ?? 0), 0);
  const accuracy = attemptsTotal ? Math.round((correctTotal / attemptsTotal) * 100) : null;
  const lastExam = (progress.sessions ?? []).find((s) => s.mode === 'exam');
  const lastBlind = (progress.blindRuns ?? [])[0];
  const orphans = orphanedIds(list.map((q) => q.id));

  if (!list.length) {
    fill(root, [
      el('h1', { text: 'CCA Prep' }),
      el('div', { class: 'notice' }, [
        el('div', { class: 'notice-title', text: 'Corpus is empty' }),
        el('div', { text: 'No questions are published yet. Run the ingest workflow, or locally: fetch docs, chunk, generate, verify.' }),
      ]),
      el('pre', { class: 'mono', style: 'background:var(--bg-sunken);padding:14px;border-radius:10px;overflow-x:auto;font-size:.8rem' },
        ['node tools/fetch-docs.mjs', 'node tools/chunk-rst.mjs', 'node tools/resolve-anchors.mjs', 'node tools/gen-templates.mjs', 'node tools/gen-ai.mjs', 'node tools/verify.mjs'].join('\n')),
    ]);
    return;
  }

  fill(root, [
    el('h1', { text: 'CCA Prep' }),
    el('p', { class: 'lede', text: 'Questions built mechanically from the Cilium documentation the exam is written against. Every answer cites the passage that settles it.' }),

    el('div', { class: 'stat-grid' }, [
      statCard(meta.total, 'questions'),
      statCard(attempted, 'attempted'),
      statCard(accuracy === null ? '—' : `${accuracy}%`, 'accuracy', accuracy !== null && accuracy >= PASS_MARK ? 'var(--good)' : null),
    ]),

    lastExam || lastBlind
      ? el('div', { class: 'card' }, [
          el('div', { class: 'filter-label', text: 'Last results' }),
          ...(lastExam
            ? [el('div', { style: 'display:flex;justify-content:space-between;padding:6px 0' }, [
                el('span', { class: 'dim', text: 'Exam simulation' }),
                el('strong', { style: `color:${lastExam.passed ? 'var(--good)' : 'var(--bad)'}`, text: `${lastExam.pct}%` }),
              ])]
            : []),
          ...(lastBlind
            ? [el('div', { style: 'display:flex;justify-content:space-between;padding:6px 0' }, [
                el('span', { class: 'dim', text: `Blind evaluation (${lastBlind.kind})` }),
                el('strong', { text: `${lastBlind.pct}%` }),
              ])]
            : []),
        ])
      : null,

    el('div', { class: 'mode-list' }, [
      modeButton('▶', 'One-week plan', 'Free videos, browser labs and practice, day by day', '#/learn'),
      modeButton('✎', 'Practice', `${meta.total} questions, filter by domain or by what you got wrong`, '#/practice'),
      modeButton('◱', 'Exam simulation', `60 questions · 90 minutes · ${PASS_MARK}% to pass`, '#/exam'),
      modeButton('◎', 'Blind evaluation', 'A held-out set you have never practised against', '#/blind'),
      modeButton('⚖', 'Review', 'Quarantined questions and your flags', '#/review'),
    ]),

    el('h2', { text: 'Coverage by domain' }),
    el('div', { class: 'card' }, DOMAIN_ORDER.map((d) =>
      el('div', { style: 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:7px 0' }, [
        el('span', { class: 'domain-name', style: 'font-size:.88rem', text: DOMAINS[d].label }),
        el('span', { class: 'faint', text: `${byDomain[d]} · ${DOMAINS[d].weight}%` }),
        el('div', { style: 'grid-column:1/-1;height:3px;background:var(--bg-sunken);border-radius:999px;overflow:hidden' }, [
          el('div', {
            style: `height:100%;width:${Math.min(100, (byDomain[d] / Math.max(1, Math.max(...Object.values(byDomain)))) * 100)}%;background:var(--accent);border-radius:999px`,
          }),
        ]),
      ]),
    )),

    orphans.length
      ? el('p', { class: 'faint', text: `${orphans.length} question${orphans.length === 1 ? '' : 's'} you answer${orphans.length === 1 ? 'ed' : 'ed'} are no longer in the corpus.` })
      : null,

    el('p', { class: 'faint', style: 'margin-top:24px', text: `Corpus from ${meta.docsRef} (${String(meta.docsSha).slice(0, 12)}) · generated ${meta.generatedAt ? new Date(meta.generatedAt).toLocaleString('en-GB') : '—'}` }),
    el('p', { class: 'faint', text: 'Generated from the Cilium documentation (CC BY 4.0). Not affiliated with CNCF or the Linux Foundation, and not a substitute for the official exam guide.' }),

    el('div', { class: 'card', style: 'margin-top:18px' }, [
      el('div', { class: 'filter-label', text: 'How this corpus was built' }),
      el('p', { class: 'faint', style: 'margin:0 0 8px', text: 'Every question passed the mechanical checks before it shipped: its citation anchor resolves on docs.cilium.io, its quoted text appears verbatim in the source section, its answer is supported by that section, and it is not a near-duplicate of another question.' }),
      meta.counts?.judgeSource === 'systemone'
        ? el('p', { class: 'faint', style: 'margin:0', text: 'Every question was also rated a good exam item by the SystemOne quality judge.' })
        : meta.counts?.judgeSource === 'adversarial'
          ? el('p', { class: 'faint', style: 'margin:0', text: 'Every question was also re-answered blind by a second model from its own citation, and agreed with the marked answer.' })
          : meta.counts?.judgeSource === 'systemone+adversarial'
            ? el('p', { class: 'faint', style: 'margin:0', text: 'Every question passed both quality judges: SystemOne rated it a good exam item, and a second model re-answered it blind and agreed.' })
            : el('div', { class: 'notice', style: 'margin:10px 0 0' }, [
                el('div', { class: 'notice-title', text: 'Quality judging has not run' }),
                el('div', { text: 'These questions passed the mechanical checks, but no model has assessed whether they read as fair, unambiguous exam items. Expect a few awkward ones.' }),
              ]),
      el('p', { class: 'faint', style: 'margin:8px 0 0', text: `${state.quarantine?.questions?.length ?? 0} candidates did not make it and are listed under Review with the reason.` }),
    ]),
  ]);

  setCorpusVersion(meta.docsRef);
  void seenIds;
}

function modeButton(icon, title, sub, href) {
  return el('a', { class: 'mode', href, style: 'text-decoration:none' }, [
    el('span', { class: 'mode-icon', text: icon }),
    el('span', { class: 'mode-body' }, [
      el('span', { class: 'mode-title', text: title }),
      el('span', { class: 'mode-sub', text: sub }),
    ]),
    el('span', { class: 'faint', text: '›' }),
  ]);
}

async function boot() {
  document.getElementById('homeBtn').addEventListener('click', () => {
    location.hash = '#/home';
  });
  window.addEventListener('hashchange', route);

  route();

  await load();

  const meta = corpusMeta();
  const badge = document.getElementById('corpusBadge');
  if (badge) badge.textContent = meta.total ? `${meta.total} questions` : 'empty corpus';

  // A regeneration that changes the corpus version is surfaced rather than
  // silently shifting what "not yet seen" means.
  route();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    try {
      // The service worker sits at the app root, but this module lives in js/,
      // so the URL is resolved against the parent, not import.meta.url. Scope
      // must be the app root too, or the SW cannot answer navigation requests.
      const swUrl = new URL('../sw.js', import.meta.url);
      const reg = await navigator.serviceWorker.register(swUrl, { scope: new URL('../', import.meta.url).pathname });
      const dot = document.getElementById('offlineDot');
      if (dot) {
        dot.classList.add('online');
        dot.title = 'Offline ready';
        dot.dataset.scope = reg.scope;
      }
    } catch (err) {
      // Offline support is a bonus, but a silent failure means the user believes
      // the app works on a plane when it does not. Say so once, in the console.
      console.warn('[cca-prep] service worker registration failed:', err.message);
    }
  }
}

boot();
