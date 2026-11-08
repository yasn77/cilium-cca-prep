/**
 * Practice mode: filtered single questions, immediate feedback, per-option
 * rationale on a wrong answer, and the citation that settles it.
 */
import { DOMAINS, DOMAIN_ORDER, questions, getState } from './data.js';
import { recordAnswer, toggleFlag, isFlagged, statsFor, recordSession } from './progress.js';
import { citationBlock, el, fill, optionButton, richText, toast } from './ui.js';

const filters = {
  domains: new Set(DOMAIN_ORDER),
  scope: 'all', // all | unseen | wrong | flagged
  yieldSource: 'any', // any | scenario | other
};

let queue = [];
let index = 0;
let answered = null; // the chosen option id for the current question
let startedAt = null;
let correctCount = 0;
let container = null;

function pool() {
  const all = questions();
  const seen = new Set();
  const out = [];
  for (const q of all) {
    if (!filters.domains.has(q.domain)) continue;
    const stat = statsFor(q.id);
    if (filters.scope === 'unseen' && stat?.attempts) continue;
    if (filters.scope === 'wrong' && (!stat || stat.correct === stat.attempts)) continue;
    if (filters.scope === 'flagged' && !isFlagged(q.id)) continue;
    if (filters.yieldSource === 'scenario' && q.yieldSource !== 'scenario') continue;
    if (filters.yieldSource === 'other' && q.yieldSource === 'scenario') continue;
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function start(root) {
  container = root;
  renderSetup();
}

function renderSetup() {
  const available = pool().length;
  const total = questions().length;

  const chips = (list, selected, onToggle) =>
    el(
      'div',
      { class: 'chip-row' },
      list.map(([value, label]) =>
        el('button', {
          class: 'chip-toggle',
          type: 'button',
          'aria-pressed': String(selected.has(value)),
          text: label,
          onclick: () => {
            if (selected.has(value)) selected.delete(value);
            else selected.add(value);
            renderSetup();
          },
        }),
      ),
    );

  fill(container, [
    el('div', {}, [
      el('h1', { text: 'Practice' }),
      el('p', { class: 'lede', text: 'Answer at your own pace. Every wrong answer explains why each option is wrong and links to the Cilium documentation that settles it.' }),
      el('div', { class: 'filter-group' }, [
        el('div', { class: 'filter-label', text: 'Scope' }),
        chips(
          [
            ['all', 'All'],
            ['unseen', 'Not yet seen'],
            ['wrong', 'Previously wrong'],
            ['flagged', 'Flagged by me'],
          ],
          new Set([filters.scope]),
          null,
        ),
      ]),
      el('div', { class: 'filter-group' }, [
        el('div', { class: 'filter-label', text: 'Domains' }),
        el(
          'div',
          { class: 'chip-row' },
          DOMAIN_ORDER.map((d) =>
            el('button', {
              class: 'chip-toggle',
              type: 'button',
              'aria-pressed': String(filters.domains.has(d)),
              text: DOMAINS[d].label,
              onclick: () => {
                if (filters.domains.has(d)) filters.domains.delete(d);
                else filters.domains.add(d);
                renderSetup();
              },
            }),
          ),
        ),
      ]),
      el('div', { class: 'filter-group' }, [
        el('div', { class: 'filter-label', text: 'Question style' }),
        el(
          'div',
          { class: 'chip-row' },
          [
            ['any', 'Any'],
            ['scenario', 'Scenario only'],
            ['other', 'Definitions and recall'],
          ].map(([v, label]) =>
            el('button', {
              class: 'chip-toggle',
              type: 'button',
              'aria-pressed': String(filters.yieldSource === v),
              text: label,
              onclick: () => {
                filters.yieldSource = v;
                renderSetup();
              },
            }),
          ),
        ),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'stat-grid', style: 'margin:0' }, [
          el('div', { class: 'stat' }, [
            el('div', { class: 'stat-value', text: String(available) }),
            el('div', { class: 'stat-label', text: 'matching' }),
          ]),
          el('div', { class: 'stat' }, [
            el('div', { class: 'stat-value', text: String(total) }),
            el('div', { class: 'stat-label', text: 'in corpus' }),
          ]),
        ]),
      ]),
      el('button', {
        class: 'btn btn-primary btn-block',
        type: 'button',
        disabled: available === 0 || undefined,
        text: available === 0 ? 'No questions match these filters' : `Start with ${Math.min(available, 40)} questions`,
        onclick: () => begin(),
      }),
    ]),
  ]);

  // Scope is a radio, not a toggle: clicking one replaces the current value.
  container.querySelectorAll('.filter-group')[0].querySelectorAll('.chip-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.scope = btn.textContent.toLowerCase().replace(/\s.*/, '');
      if (btn.textContent.startsWith('Not yet')) filters.scope = 'unseen';
      if (btn.textContent.startsWith('Previously')) filters.scope = 'wrong';
      if (btn.textContent.startsWith('Flagged')) filters.scope = 'flagged';
      if (btn.textContent.startsWith('All')) filters.scope = 'all';
      renderSetup();
    });
  });
}

function begin() {
  queue = shuffle(pool()).slice(0, 40);
  index = 0;
  correctCount = 0;
  startedAt = Date.now();
  renderQuestion();
}

function renderQuestion() {
  const q = queue[index];
  if (!q) return renderSummary();
  answered = null;

  const stat = statsFor(q.id);
  const flagged = isFlagged(q.id);

  const meta = el('div', { class: 'q-meta' }, [
    el('span', { class: 'chip chip-accent', text: DOMAINS[q.domain]?.label ?? q.domain }),
    q.competency ? el('span', { class: 'chip', text: q.competency.replace(/-/g, ' ') }) : null,
    el('span', { class: 'chip', text: q.yieldSource }),
    stat ? el('span', { class: 'chip', text: `seen ${stat.attempts}×` }) : null,
  ]);

  const optionsWrap = el('div', { class: 'options' });
  const feedbackWrap = el('div', {});

  const paint = () => {
    fill(optionsWrap, [
      ...q.options.map((o) =>
        optionButton(o, {
          disabled: answered !== null,
          state:
            answered === null
              ? null
              : o.id === q.answer
                ? 'correct'
                : o.id === answered
                  ? 'incorrect'
                  : null,
          onClick: () => choose(o.id),
        }),
      ),
    ]);
  };

  const choose = (optionId) => {
    if (answered !== null) return;
    answered = optionId;
    const correct = optionId === q.answer;
    if (correct) correctCount += 1;
    recordAnswer(q.id, correct);
    paint();
    feedbackWrap.replaceChildren(feedback(q, correct));
    nextBtn.disabled = false;
    nextBtn.focus();
  };

  const nextBtn = el('button', {
    class: 'btn btn-primary btn-block',
    type: 'button',
    text: index === queue.length - 1 ? 'See summary' : 'Next question',
    disabled: true,
    onclick: () => {
      index += 1;
      renderQuestion();
      window.scrollTo({ top: 0 });
    },
  });

  paint();

  fill(container, [
    el('div', { class: 'exam-bar' }, [
      el('span', { class: 'faint', text: `${index + 1} / ${queue.length}` }),
      el('div', { class: 'progress-track' }, [
        el('div', { class: 'progress-fill', style: `width:${((index + 1) / queue.length) * 100}%` }),
      ]),
      el('button', {
        class: 'icon-btn',
        type: 'button',
        title: flagged ? 'Remove flag' : 'Flag this question',
        'aria-label': 'Flag this question',
        style: `font-size:1.1rem;color:${flagged ? 'var(--warn)' : 'var(--fg-faint)'}`,
        text: flagged ? '★' : '☆',
        onclick: (e) => {
          const now = toggleFlag(q.id);
          e.currentTarget.textContent = now ? '★' : '☆';
          e.currentTarget.style.color = now ? 'var(--warn)' : 'var(--fg-faint)';
          toast(now ? 'Flagged — included in your flag export' : 'Flag removed');
        },
      }),
    ]),
    meta,
    el('div', { class: 'q-stem' }, [richText(q.stem)]),
    optionsWrap,
    feedbackWrap,
    el('div', { style: 'margin-top:16px' }, [nextBtn]),
  ]);
}

function feedback(q, correct) {
  const wrongOptions = q.options.filter((o) => o.id !== q.answer);
  const rationale = q.optionRationale ?? {};
  const box = el('div', { class: `feedback ${correct ? 'good' : 'bad'}` }, [
    el('div', { class: 'feedback-title' }, [
      el('span', { text: correct ? '✓' : '✕' }),
      el('span', { text: correct ? 'Correct' : `Not quite — the answer is ${q.answer.toUpperCase()}` }),
    ]),
    el('div', {}, [richText(q.explanation)]),
  ]);

  if (!correct) {
    const items = wrongOptions
      .filter((o) => rationale[o.id])
      .map((o) =>
        el('li', { 'data-letter': o.id, text: `${o.text.slice(0, 60)}${o.text.length > 60 ? '…' : ''} — ${rationale[o.id]}` }),
      );
    if (items.length) {
      box.append(el('div', { class: 'faint', style: 'margin-top:10px;text-transform:uppercase;letter-spacing:.06em;font-size:.68rem', text: 'Why the others are wrong' }));
      box.append(el('ul', { class: 'rationale-list' }, items));
    }
  }

  for (const c of q.citations ?? []) box.append(citationBlock(c));
  return box;
}

function renderSummary() {
  const total = queue.length;
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  recordSession({ mode: 'practice', total, correct: correctCount, elapsed });

  fill(container, [
    el('div', { class: 'score-hero' }, [
      el('div', { class: 'score-value', text: `${Math.round((correctCount / total) * 100)}%` }),
      el('div', { class: 'score-label', text: `${correctCount} of ${total} correct in ${Math.floor(elapsed / 60)}m ${elapsed % 60}s` }),
    ]),
    el('div', { class: 'btn-row', style: 'margin-top:20px;justify-content:center' }, [
      el('button', { class: 'btn btn-primary', type: 'button', text: 'Practise again', onclick: () => begin() }),
      el('button', { class: 'btn', type: 'button', text: 'Change filters', onclick: () => renderSetup() }),
    ]),
    el('p', { class: 'faint', style: 'margin-top:24px;text-align:center', text: 'Questions you got wrong are in Practice → Previously wrong.' }),
  ]);
}
