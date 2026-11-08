/**
 * The one-week study plan.
 *
 * Content lives in data/guide.json so the plan can be edited without touching
 * code, and so the links are reviewable in a diff. Everything here is a link the
 * learner is meant to open, so the rendering is built around making that obvious
 * and easy to tap on a phone.
 */
import { getState, DOMAINS } from './data.js';
import { el, fill, richText } from './ui.js';

const KIND_META = {
  watch: { icon: '▶', label: 'Watch' },
  lab: { icon: '⚗', label: 'Lab' },
  read: { icon: '❏', label: 'Read' },
  practise: { icon: '✎', label: 'Practise' },
};

let container = null;
let openDay = null;

export function start(root) {
  container = root;
  render();
}

function guide() {
  return getState().guide ?? null;
}

/** An external link, or a plain card when the item has no URL. */
function itemCard(item) {
  const kind = KIND_META[item.kind] ?? { icon: '·', label: '' };
  const inner = [
    el('div', { class: 'res-head' }, [
      el('span', { class: 'res-icon', text: kind.icon, 'aria-hidden': 'true' }),
      el('div', { class: 'res-title' }, [richText(item.title)]),
    ]),
    item.meta ? el('div', { class: 'res-meta', text: item.meta }) : null,
    item.why ? el('div', { class: 'res-why', text: item.why }) : null,
  ];

  if (item.url) {
    return el(
      'a',
      {
        class: 'res-card res-link',
        href: item.url,
        target: '_blank',
        rel: 'noreferrer noopener',
      },
      [...inner, el('span', { class: 'res-go', text: 'Open ↗' })],
    );
  }

  // No URL means the item happens inside this app, or it is a resource that has
  // no working link (the retired edX course, a paid course). Only say "In this
  // app" for the former: claiming it for a dead link would be a lie the learner
  // discovers by tapping.
  const inApp = item.kind === 'practise' || item.inApp === true;
  return el('div', { class: 'res-card' }, [
    ...inner,
    inApp ? el('span', { class: 'res-go res-inapp', text: 'In this app' }) : null,
  ]);
}

function dayBlock(day, isOpen) {
  const details = el('details', { class: 'day-block', open: isOpen ? '' : null });
  const focusLabels = (day.focus ?? [])
    .map((f) => (f === 'all' ? 'All domains' : DOMAINS[f]?.label ?? f))
    .join(' · ');

  details.append(
    el('summary', { class: 'day-summary' }, [
      el('span', { class: 'day-num', text: `Day ${day.day}` }),
      el('span', { class: 'day-title', text: day.title }),
      el('span', { class: 'day-weight', text: `${day.weight}%` }),
    ]),
    el('div', { class: 'day-body' }, [
      el('div', { class: 'day-focus', text: focusLabels }),
      el('p', { class: 'day-summary-text', text: day.summary }),
      el('div', { class: 'res-list' }, day.items.map(itemCard)),
    ]),
  );

  details.addEventListener('toggle', () => {
    if (details.open) openDay = day.day;
  });

  return details;
}

function render() {
  const g = guide();

  if (!g) {
    fill(container, [
      el('h1', { text: 'Learn' }),
      el('div', { class: 'empty' }, [
        el('div', { class: 'empty-icon', text: '▶' }),
        el('div', { text: 'The study guide has not been published with this build.' }),
      ]),
    ]);
    return;
  }

  const total = g.days.length;
  const current = openDay ?? g.days[0].day;

  fill(container, [
    el('h1', { text: g.title }),
    el('p', { class: 'lede', text: g.intro }),

    el('div', { class: 'notice' }, [
      el('div', { class: 'notice-title', text: `Links checked ${g.verifiedOn}` }),
      el('div', { text: g.note }),
    ]),

    el('div', { class: 'stat-grid' }, [
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value', text: String(total) }),
        el('div', { class: 'stat-label', text: 'days' }),
      ]),
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value', text: '~2h' }),
        el('div', { class: 'stat-label', text: 'per day' }),
      ]),
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value', text: 'Free' }),
        el('div', { class: 'stat-label', text: 'videos and labs' }),
      ]),
    ]),

    el('div', { class: 'btn-row', style: 'margin-bottom:18px' }, [
      el('button', {
        class: 'btn btn-primary',
        type: 'button',
        text: `Start with day ${current}`,
        onclick: () => {
          const node = document.querySelector(`.day-block:nth-of-type(${current})`);
          if (node) {
            node.open = true;
            node.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }
        },
      }),
    ]),

    el('div', { class: 'day-list' }, g.days.map((d) => dayBlock(d, d.day === current))),

    el('h2', { text: 'All references' }),

    ...g.references.map((group) =>
      el('div', { class: 'ref-group' }, [
        el('div', { class: 'filter-label', text: group.group }),
        el('div', { class: 'res-list' }, group.items.map((item) =>
          itemCard({ kind: 'read', ...item, why: item.note }),
        )),
      ]),
    ),

    el('p', { class: 'faint', style: 'margin-top:24px', text: 'Links open in a new tab. Nothing here requires an account except the Isovalent labs, which need a free one.' }),
  ]);
}
