/**
 * Exam simulation: 60 questions, 90 minutes, weighted by the official domain
 * percentages, no feedback until submission, scored against the published 75%
 * pass mark.
 */
import {
  DOMAINS,
  DOMAIN_ORDER,
  questions,
  buildExamPaper,
  domainBreakdown,
  difficultyTier,
  difficultyOf,
  PASS_MARK,
} from './data.js';
import { recordSession } from './progress.js';
import { attachmentBlocks, citationBlock, difficultyBadge, el, fill, richText } from './ui.js';

const DURATION_SECONDS = 90 * 60;

let paper = [];
let answers = {};
let current = 0;
let deadline = 0;
let timerHandle = null;
let container = null;
let submitted = false;
// 3.0 is the real exam; the paper is drawn from that band by default.
let targetDifficulty = 3;

export function start(root) {
  container = root;
  renderIntro();
}

function renderIntro() {
  clearInterval(timerHandle);
  const total = questions().length;
  const { shortfall } = buildExamPaper(questions(), 60);
  const short = Object.keys(shortfall ?? {});

  fill(container, [
    el('h1', { text: 'Exam simulation' }),
    el('p', { class: 'lede', text: 'Sixty questions, ninety minutes, weighted the way the real exam is. No feedback until you submit.' }),
    el('div', { class: 'card' }, [
      el('div', { class: 'stat-grid', style: 'margin:0' }, [
        el('div', { class: 'stat' }, [el('div', { class: 'stat-value', text: '60' }), el('div', { class: 'stat-label', text: 'questions' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'stat-value', text: '90' }), el('div', { class: 'stat-label', text: 'minutes' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'stat-value', text: `${PASS_MARK}%` }), el('div', { class: 'stat-label', text: 'pass mark' })]),
      ]),
    ]),
    total < 60
      ? el('div', { class: 'notice' }, [
          el('div', { class: 'notice-title', text: 'Small corpus' }),
          el('div', { text: `Only ${total} questions are available, so the paper cannot follow the official domain weights exactly.` }),
        ])
      : short.length
        ? el('div', { class: 'notice' }, [
            el('div', { class: 'notice-title', text: 'Domain shortfall' }),
            el('div', { text: `${short.map((d) => DOMAINS[d].label).join(', ')} do not have enough questions to fill their quota; the paper is topped up from other domains.` }),
          ])
        : null,
    difficultyControl(),
    el('button', { class: 'btn btn-primary btn-block', type: 'button', text: 'Start the timed exam', onclick: startExam }),
  ]);
}

function startExam() {
  const built = buildExamPaper(questions(), 60, targetDifficulty);
  paper = built.paper;
  answers = {};
  current = 0;
  submitted = false;
  deadline = Date.now() + DURATION_SECONDS * 1000;
  renderExam();
  clearInterval(timerHandle);
  timerHandle = setInterval(tick, 1000);
}

function difficultyControl() {
  const tier = difficultyTier(targetDifficulty);
  const output = el('span', { class: 'slider-value', text: targetDifficulty.toFixed(1) });
  const note = el('div', { class: 'slider-note', text: `${tier.label} — ${tier.note}` });

  const input = el('input', {
    type: 'range',
    min: '1',
    max: '5',
    step: '0.5',
    value: String(targetDifficulty),
    class: 'difficulty-slider',
    'aria-label': 'Paper difficulty',
    oninput: (e) => {
      targetDifficulty = Number(e.target.value);
      const t = difficultyTier(targetDifficulty);
      output.textContent = targetDifficulty.toFixed(1);
      note.textContent = `${t.label} — ${t.note}`;
    },
  });

  return el('div', { class: 'filter-group difficulty-group' }, [
    el('div', { class: 'slider-head' }, [
      el('span', { class: 'filter-label', text: 'Difficulty' }),
      output,
    ]),
    input,
    el('div', { class: 'slider-ends' }, [
      el('span', { text: 'easier' }),
      el('span', { text: 'harder' }),
    ]),
    note,
  ]);
}

function tick() {
  const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
  const node = document.getElementById('examTimer');
  if (node) {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    node.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    node.classList.toggle('low', remaining < 300);
  }
  if (remaining === 0) {
    clearInterval(timerHandle);
    submit(true);
  }
}

function renderExam() {
  const q = paper[current];
  const answeredCount = Object.keys(answers).length;

  const nav = el(
    'div',
    { class: 'nav-grid', style: 'margin:16px 0' },
    paper.map((item, i) =>
      el('button', {
        class: `nav-dot${answers[item.id] ? ' answered' : ''}${i === current ? ' current' : ''}`,
        type: 'button',
        text: String(i + 1),
        onclick: () => {
          current = i;
          renderExam();
          window.scrollTo({ top: 0 });
        },
      }),
    ),
  );

  fill(container, [
    el('div', { class: 'exam-bar' }, [
      el('span', { class: 'timer', id: 'examTimer', text: '90:00' }),
      el('div', { class: 'progress-track' }, [
        el('div', { class: 'progress-fill', style: `width:${(answeredCount / paper.length) * 100}%` }),
      ]),
      el('span', { class: 'faint', text: `${answeredCount}/${paper.length}` }),
    ]),
    el('div', { class: 'q-meta' }, [
      el('span', { class: 'chip chip-accent', text: DOMAINS[q.domain]?.label ?? q.domain }),
      el('span', { class: 'chip', text: `Question ${current + 1}` }),
      difficultyBadge(difficultyOf(q)),
    ]),
    el('div', { class: 'q-stem' }, [richText(q.stem)]),
    ...attachmentBlocks(q.attachments),
    el(
      'div',
      { class: 'options' },
      q.options.map((o) =>
        el(
          'button',
          {
            class: `option${answers[q.id] === o.id ? ' chosen-neutral' : ''}`,
            type: 'button',
            style: answers[q.id] === o.id ? 'border-color:var(--accent)' : '',
            onclick: () => {
              answers[q.id] = o.id;
              renderExam();
              window.scrollTo({ top: 0 });
            },
          },
          [
            el('span', { class: 'option-letter', text: o.id }),
            el('span', { class: 'option-text' }, [richText(o.text)]),
          ],
        ),
      ),
    ),
    el('div', { class: 'btn-row', style: 'margin-bottom:20px' }, [
      el('button', {
        class: 'btn',
        type: 'button',
        text: 'Previous',
        disabled: current === 0 || undefined,
        onclick: () => {
          current = Math.max(0, current - 1);
          renderExam();
          window.scrollTo({ top: 0 });
        },
      }),
      el('button', {
        class: 'btn btn-primary',
        type: 'button',
        text: current === paper.length - 1 ? 'Review and submit' : 'Next',
        style: 'flex:1',
        onclick: () => {
          if (current === paper.length - 1) submit(false);
          else {
            current += 1;
            renderExam();
            window.scrollTo({ top: 0 });
          }
        },
      }),
    ]),
    el('h2', { text: 'Jump to question' }),
    nav,
    el('button', {
      class: 'btn btn-block',
      type: 'button',
      style: 'margin-top:8px',
      text: 'Submit exam now',
      onclick: () => submit(false),
    }),
  ]);
  tick();
}

function submit(timedOut) {
  if (submitted) return;
  submitted = true;
  clearInterval(timerHandle);

  const right = paper.filter((q) => answers[q.id] === q.answer).length;
  const pct = Math.round((right / paper.length) * 100);
  const passed = pct >= PASS_MARK;
  const breakdown = domainBreakdown(answers, paper);
  recordSession({ mode: 'exam', total: paper.length, correct: right, pct, passed, timedOut });

  const wrong = paper.filter((q) => answers[q.id] !== q.answer);

  fill(container, [
    timedOut ? el('div', { class: 'notice' }, [el('div', { class: 'notice-title', text: 'Time expired' }), el('div', { text: 'The exam was submitted automatically.' })]) : el('div', {}),
    el('div', { class: 'score-hero' }, [
      el('div', { class: `score-value ${passed ? 'score-pass' : 'score-fail'}`, text: `${pct}%` }),
      el('div', { class: 'score-label', text: `${right} of ${paper.length} correct — ${passed ? 'pass' : `below the ${PASS_MARK}% pass mark`}` }),
    ]),
    el('h2', { text: 'By domain' }),
    el(
      'div',
      { class: 'card' },
      DOMAIN_ORDER.filter((d) => breakdown[d]).map((d) => {
        const b = breakdown[d];
        const colour = b.pct >= PASS_MARK ? 'var(--good)' : b.pct >= 50 ? 'var(--warn)' : 'var(--bad)';
        return el('div', { style: 'display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:9px 0' }, [
          el('div', { class: 'domain-name', text: DOMAINS[d].label }),
          el('div', { class: 'domain-score', style: `color:${colour}`, text: `${b.right}/${b.total}` }),
          el('div', { style: 'grid-column:1/-1;height:4px;background:var(--bg-sunken);border-radius:999px;overflow:hidden' }, [
            el('div', { style: `height:100%;width:${b.pct}%;background:${colour};border-radius:999px` }),
          ]),
        ]);
      }),
    ),
    wrong.length
      ? el('h2', { text: `Review your ${wrong.length} wrong answer${wrong.length === 1 ? '' : 's'}` })
      : el('p', { class: 'faint', text: 'A clean sheet. Nothing to review.' }),
    ...wrong.map((q) =>
      el('details', { class: 'review-item' }, [
        el('summary', {}, [
          difficultyBadge(difficultyOf(q)),
          richText(q.stem.slice(0, 110) + (q.stem.length > 110 ? '…' : '')),
        ]),
        el('div', { class: 'review-body' }, [
          el('div', { class: 'faint', style: 'margin-bottom:8px' }, [
            `You answered ${(answers[q.id] ?? '—').toUpperCase()}; the answer is ${q.answer.toUpperCase()}.`,
          ]),
          el('div', {}, [richText(q.explanation)]),
          ...(q.citations ?? []).map((c) => citationBlock(c)),
        ]),
      ]),
    ),
    el('div', { class: 'btn-row', style: 'margin-top:24px' }, [
      el('button', { class: 'btn btn-primary', type: 'button', text: 'Another exam', onclick: renderIntro }),
    ]),
  ]);
  window.scrollTo({ top: 0 });
}
