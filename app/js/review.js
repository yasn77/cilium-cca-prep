/**
 * Review tab.
 *
 * Two things live here, and they are different in kind:
 *
 *  - Quarantined questions: generated candidates that failed a mechanical check
 *    or the quality judge. They are shown with the reason, so a wrong answer in
 *    the main corpus is auditable rather than mysterious, but they are never
 *    practisable.
 *  - Your flags: questions you marked as wrong. Exporting them produces the
 *    shape overrides/*.json expects.
 */
import { DOMAINS, getState } from './data.js';
import { getProgress, exportFlags, toggleFlag, resetAll } from './progress.js';
import { citationBlock, el, fill, richText, toast } from './ui.js';

let container = null;

export function start(root) {
  container = root;
  render();
}

function render() {
  const state = getState();
  const quarantine = state.quarantine?.questions ?? [];
  const byGate = state.quarantine?.counts?.byGate ?? {};
  const progress = getProgress();
  const flaggedCount = progress.flagged.length;
  const corpusIds = new Set((state.corpus?.questions ?? []).map((q) => q.id));
  const orphaned = progress.flagged.filter((id) => !corpusIds.has(id));

  const gateLabels = {
    shape: 'Malformed',
    anchor: 'Citation anchor not verified on the live site',
    quote: 'Quoted text not found in the cited section',
    entail: 'Answer not supported by the cited section',
    judge: 'Rejected by the quality judge',
    duplicate: 'Near-duplicate of another question',
  };

  fill(container, [
    el('h1', { text: 'Review' }),
    el('p', { class: 'lede', text: 'What did not make it into the corpus, and why. Nothing here is practisable.' }),

    el('div', { class: 'stat-grid' }, [
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value', text: String(state.corpus?.questions?.length ?? 0) }),
        el('div', { class: 'stat-label', text: 'in corpus' }),
      ]),
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value', text: String(quarantine.length) }),
        el('div', { class: 'stat-label', text: 'quarantined' }),
      ]),
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value', text: String(flaggedCount) }),
        el('div', { class: 'stat-label', text: 'flagged by you' }),
      ]),
    ]),

    el('h2', { text: 'Quarantine by reason' }),
    Object.keys(byGate).length
      ? el('div', { class: 'card' }, Object.entries(byGate).map(([gate, n]) =>
          el('div', { style: 'display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line-soft)' }, [
            el('span', { class: 'dim', style: 'font-size:.88rem', text: gateLabels[gate] ?? gate }),
            el('strong', { text: String(n) }),
          ]),
        ))
      : el('p', { class: 'faint', text: 'Nothing was quarantined.' }),

    flaggedCount
      ? el('div', { class: 'card' }, [
          el('div', { class: 'filter-label', text: `Your ${flaggedCount} flag${flaggedCount === 1 ? '' : 's'}` }),
          el('p', { class: 'faint', text: 'Export these to overrides/flags.json and the pipeline will treat them as questions to review.' }),
          el('div', { class: 'btn-row' }, [
            el('button', {
              class: 'btn',
              type: 'button',
              text: 'Export flags as JSON',
              onclick: () => {
                const data = JSON.stringify(exportFlags(), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'flags.json';
                a.click();
                URL.revokeObjectURL(a.href);
                toast('flags.json downloaded');
              },
            }),
          ]),
          orphaned.length
            ? el('p', { class: 'faint', style: 'margin-top:10px', text: `${orphaned.length} flagged question${orphaned.length === 1 ? '' : 's'} no longer exist in the current corpus.` })
            : null,
          ...progress.flagged.map((id) => {
            const q = (state.corpus?.questions ?? []).find((x) => x.id === id);
            if (!q) return null;
            return el('details', { class: 'review-item' }, [
              el('summary', {}, [richText(q.stem.slice(0, 100) + (q.stem.length > 100 ? '…' : ''))]),
              el('div', { class: 'review-body' }, [
                el('div', { class: 'faint', style: 'margin-bottom:8px', text: `Answer: ${q.answer.toUpperCase()} — ${q.options.find((o) => o.id === q.answer)?.text ?? ''}` }),
                el('div', {}, [richText(q.explanation)]),
                ...(q.citations ?? []).map((c) => citationBlock(c)),
                el('button', {
                  class: 'btn',
                  type: 'button',
                  style: 'margin-top:10px',
                  text: 'Remove flag',
                  onclick: () => {
                    toggleFlag(id);
                    render();
                  },
                }),
              ]),
            ]);
          }),
        ])
      : null,

    el('h2', { text: `Quarantined questions (${quarantine.length})` }),
    quarantine.length === 0
      ? el('p', { class: 'faint', text: 'None.' })
      : el(
          'div',
          {},
          quarantine.slice(0, 120).map((q) =>
            el('details', { class: 'review-item' }, [
              el('summary', {}, [
                el('span', { class: 'chip', style: 'margin-right:8px', text: q.rejection?.gate ?? 'unknown' }),
                richText((q.stem ?? '').slice(0, 90) + ((q.stem ?? '').length > 90 ? '…' : '')),
              ]),
              el('div', { class: 'review-body' }, [
                el('div', { class: 'notice', style: 'margin-bottom:12px' }, [
                  el('div', { class: 'notice-title', text: gateLabels[q.rejection?.gate] ?? 'Rejected' }),
                  el('div', { class: 'faint mono', text: q.rejection?.reason ?? '—' }),
                ]),
                q.stem ? el('div', { class: 'q-stem', style: 'font-size:.95rem' }, [richText(q.stem)]) : null,
                q.options
                  ? el('div', { class: 'options', style: 'margin-bottom:10px' }, q.options.map((o) =>
                      el('div', { class: `option${o.id === q.answer ? ' correct' : ''}`, style: 'cursor:default' }, [
                        el('span', { class: 'option-letter', text: o.id }),
                        el('span', { class: 'option-text' }, [richText(o.text)]),
                      ]),
                    ))
                  : null,
                ...(q.citations ?? []).map((c) => citationBlock(c)),
                el('div', { class: 'citation-path', style: 'margin-top:8px', text: `domain ${q.domain} · ${q.yieldSource} · id ${q.id}` }),
              ]),
            ]),
          ),
        ),

    el('h2', { text: 'Progress' }),
    el('div', { class: 'card' }, [
      el('p', { class: 'faint', text: 'Progress is stored in this browser only. Clearing site data or using another device starts fresh.' }),
      el('button', {
        class: 'btn',
        type: 'button',
        text: 'Reset all progress',
        onclick: () => {
          if (confirm('Delete all practice history, flags and blind-evaluation runs?')) {
            resetAll();
            toast('Progress cleared');
            render();
          }
        },
      }),
    ]),
    el('p', { class: 'faint', style: 'margin-top:18px', text: `Corpus ${state.corpus?.docsRef ?? '—'} · ${DOMAINS ? Object.keys(DOMAINS).length : 0} domains · generated ${state.corpus?.generatedAt ? new Date(state.corpus.generatedAt).toLocaleString('en-GB') : '—'}` }),
  ]);
}
