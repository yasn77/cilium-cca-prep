/**
 * Blind evaluation.
 *
 * Uses the held-out set that is never shown in practice mode. Two runs matter:
 * one before the app has taught you anything, one at the end. The delta is the
 * only honest measure of whether any of this is working, because practice scores
 * only measure agreement with the generator's own blind spots.
 */
import { displayBlindSet, DOMAINS } from './data.js';
import { getProgress, recordBlindRun } from './progress.js';
import { citationBlock, el, fill, richText } from './ui.js';

let paper = [];
let answers = {};
let current = 0;
let container = null;
let submitted = false;

export function start(root) {
  container = root;
  renderIntro();
}

function renderIntro() {
  const set = displayBlindSet();
  const runs = getProgress().blindRuns ?? [];
  const baseline = runs.filter((r) => r.kind === 'baseline').slice(-1)[0];
  const final = runs.filter((r) => r.kind === 'final').slice(-1)[0];

  if (!set.length) {
    fill(container, [
      el('h1', { text: 'Blind evaluation' }),
      el('p', { class: 'lede', text: 'A held-out set of questions the app never teaches from.' }),
      el('div', { class: 'empty' }, [
        el('div', { class: 'empty-icon', text: '◎' }),
        el('div', { text: 'The blind set has not been built yet. Run tools/blind-set.mjs to fetch it.' }),
      ]),
    ]);
    return;
  }

  fill(container, [
    el('h1', { text: 'Blind evaluation' }),
    el('p', { class: 'lede', text: 'These questions were never used to build the corpus, so your score here is the only one that measures you rather than the generator.' }),
    runs.length
      ? el('div', { class: 'card' }, [
          el('div', { class: 'stat-grid', style: 'margin:0' }, [
            el('div', { class: 'stat' }, [
              el('div', { class: 'stat-value', text: baseline ? `${baseline.pct}%` : '—' }),
              el('div', { class: 'stat-label', text: 'baseline' }),
            ]),
            el('div', { class: 'stat' }, [
              el('div', { class: 'stat-value', text: final ? `${final.pct}%` : '—' }),
              el('div', { class: 'stat-label', text: 'latest' }),
            ]),
            el('div', { class: 'stat' }, [
              el('div', { class: 'stat-value', text: baseline && final ? `${final.pct - baseline.pct > 0 ? '+' : ''}${final.pct - baseline.pct}` : '—' }),
              el('div', { class: 'stat-label', text: 'change' }),
            ]),
          ]),
        ])
      : null,
    el('div', { class: 'notice' }, [
      el('div', { class: 'notice-title', text: 'Take it twice' }),
      el('div', { text: 'Once now as a baseline, once at the end. Do not retake in between: repeated exposure to the same questions turns a measurement into practice.' }),
    ]),
    el('div', { class: 'stat-grid' }, [
      el('div', { class: 'stat' }, [el('div', { class: 'stat-value', text: String(set.length) }), el('div', { class: 'stat-label', text: 'questions' })]),
      el('div', { class: 'stat' }, [el('div', { class: 'stat-value', text: 'No' }), el('div', { class: 'stat-label', text: 'feedback during' })]),
    ]),
    el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn btn-primary', type: 'button', text: baseline ? 'Take the final measurement' : 'Take the baseline', onclick: () => begin(baseline ? 'final' : 'baseline') }),
    ]),
    el('h2', { text: 'Past runs' }),
    ...runs.map((r) =>
      el('div', { class: 'card', style: 'padding:12px 14px' }, [
        el('div', { style: 'display:flex;justify-content:space-between;gap:10px;align-items:baseline' }, [
          el('strong', { text: `${r.pct}%` }),
          el('span', { class: 'faint', text: `${r.kind} · ${new Date(r.at).toLocaleString('en-GB')}` }),
        ]),
      ]),
    ),
  ]);
}

function begin(kind) {
  paper = [...displayBlindSet()];
  answers = {};
  current = 0;
  submitted = false;
  renderQuestion(kind);
}

function renderQuestion(kind) {
  const q = paper[current];
  fill(container, [
    el('div', { class: 'exam-bar' }, [
      el('span', { class: 'faint', text: `${current + 1} / ${paper.length}` }),
      el('div', { class: 'progress-track' }, [
        el('div', { class: 'progress-fill', style: `width:${((current + 1) / paper.length) * 100}%` }),
      ]),
    ]),
    el('div', { class: 'q-meta' }, [
      q.domain ? el('span', { class: 'chip chip-accent', text: DOMAINS[q.domain]?.label ?? q.domain }) : null,
      el('span', { class: 'chip', text: 'blind' }),
    ]),
    el('div', { class: 'q-stem' }, [richText(q.stem)]),
    el(
      'div',
      { class: 'options' },
      q.options.map((o) =>
        el(
          'button',
          {
            class: 'option',
            type: 'button',
            style: answers[q.id] === o.id ? 'border-color:var(--accent)' : '',
            onclick: () => {
              answers[q.id] = o.id;
              advance(kind);
            },
          },
          [
            el('span', { class: 'option-letter', text: o.id }),
            el('span', { class: 'option-text' }, [richText(o.text)]),
          ],
        ),
      ),
    ),
  ]);
  window.scrollTo({ top: 0 });
}

function advance(kind) {
  if (current === paper.length - 1) finish(kind);
  else {
    current += 1;
    renderQuestion(kind);
  }
}

function finish(kind) {
  if (submitted) return;
  submitted = true;
  const right = paper.filter((q) => answers[q.id] === q.answer).length;
  const pct = Math.round((right / paper.length) * 100);
  recordBlindRun({ kind, total: paper.length, correct: right, pct });

  const wrong = paper.filter((q) => answers[q.id] !== q.answer);
  fill(container, [
    el('div', { class: 'score-hero' }, [
      el('div', { class: 'score-value', text: `${pct}%` }),
      el('div', { class: 'score-label', text: `${right} of ${paper.length} — recorded as your ${kind} measurement` }),
    ]),
    el('h2', { text: 'What you got wrong' }),
    ...wrong.map((q) =>
      el('details', { class: 'review-item' }, [
        el('summary', {}, [richText(q.stem.slice(0, 110) + (q.stem.length > 110 ? '…' : ''))]),
        el('div', { class: 'review-body' }, [
          el('div', { class: 'faint', style: 'margin-bottom:8px', text: `You answered ${(answers[q.id] ?? '—').toUpperCase()}; the answer is ${q.answer.toUpperCase()}.` }),
          q.explanation ? el('div', {}, [richText(q.explanation)]) : null,
          ...(q.citations ?? []).map((c) => citationBlock(c)),
          q.source ? el('p', { class: 'citation-path', text: `Source: ${q.source}` }) : null,
        ]),
      ]),
    ),
    el('div', { class: 'btn-row', style: 'margin-top:24px' }, [
      el('button', { class: 'btn', type: 'button', text: 'Back', onclick: renderIntro }),
    ]),
  ]);
  window.scrollTo({ top: 0 });
}
