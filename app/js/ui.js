/**
 * Rendering primitives. Everything returns DOM nodes built by hand — no
 * innerHTML with interpolated content, because question text comes from a
 * generator and must never be parsed as markup.
 */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v; // only for trusted static markup
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  flatten(children, node);
  return node;
}

/**
 * Append children, dropping nullish entries.
 *
 * Call sites pass `cond ? node : null` freely, and `node.append(null)` would
 * otherwise insert the literal text "null" into the page.
 */
export function flatten(children, node) {
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    if (Array.isArray(child)) {
      flatten(child, node);
      continue;
    }
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Replace a container's children, dropping nullish entries the same way. */
export function fill(node, children) {
  node.replaceChildren();
  return flatten(children, node);
}

/** Render a stem, turning `code`, **bold** and fenced blocks into elements. */
export function richText(text) {
  const frag = document.createDocumentFragment();
  // Some generators emit doubled backticks (``devices``) and some single, and
  // some emit a mix. Normalising first means the inline parser sees one form.
  const normalised = String(text).replace(/``([^`]+)``/g, '`$1`');
  const parts = normalised.split(/```/);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      frag.append(el('pre', { class: 'mono', style: 'background:var(--bg-sunken);padding:10px;border-radius:8px;overflow-x:auto;font-size:.82rem;margin:8px 0' }, [part.trim()]));
      return;
    }
    // Inline: split on backticks first, then emphasis.
    const chunks = part.split(/(`[^`]+`)/);
    for (const chunk of chunks) {
      if (!chunk) continue;
      if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 2) {
        frag.append(el('code', { text: chunk.slice(1, -1) }));
        continue;
      }
      const boldParts = chunk.split(/(\*\*[^*]+\*\*)/);
      for (const b of boldParts) {
        if (!b) continue;
        if (b.startsWith('**') && b.endsWith('**') && b.length > 4) {
          frag.append(el('strong', { text: b.slice(2, -2) }));
        } else {
          frag.append(document.createTextNode(b));
        }
      }
    }
  });
  return frag;
}

export function toast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => node.classList.remove('show'), 2200);
}

/**
 * Material the question depends on: a manifest, command output, a passage or a
 * diagram. Rendered between the stem and the options, because the reader has to
 * see it before answering — that is how the real exam UI presents an item that
 * shows a policy.
 */
export function attachmentBlock(attachment) {
  const wrap = el('figure', {
    class: 'attachment',
    style:
      'margin:0 0 16px;border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-sunken)',
  });

  wrap.append(
    el('figcaption', {
      style:
        'padding:8px 12px;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);border-bottom:1px solid var(--line-soft)',
      text: attachment.title,
    }),
  );

  if (attachment.kind === 'diagram') {
    if (attachment.src) {
      wrap.append(
        el('img', {
          src: attachment.src,
          alt: attachment.alt || attachment.title,
          style: 'display:block;max-width:100%;height:auto',
        }),
      );
    } else {
      wrap.append(
        el('div', { style: 'padding:12px;color:var(--fg-dim);font-size:.85rem', text: 'Diagram not available offline.' }),
      );
    }
    return wrap;
  }

  if (attachment.kind === 'text') {
    wrap.append(el('div', { style: 'padding:12px;font-size:.9rem;line-height:1.5' }, [richText(attachment.body)]));
    return wrap;
  }

  // manifest and output: verbatim, monospaced, never reflowed.
  wrap.append(
    el('pre', {
      class: 'mono',
      style:
        'margin:0;padding:12px;overflow-x:auto;font-size:.78rem;line-height:1.45;white-space:pre;tab-size:2',
      text: attachment.body,
    }),
  );
  return wrap;
}

export function attachmentBlocks(attachments) {
  return (attachments ?? []).map((a) => attachmentBlock(a));
}

/**
 * Difficulty chip.
 *
 * Colour is the tier, and the number is the SystemOne score, so a question you
 * miss can be judged as "that was a stretch item" rather than a knowledge gap.
 */
export function difficultyBadge(value) {
  if (typeof value !== 'number') return null;
  const tone =
    value <= 2.5 ? 'var(--good)' : value <= 3.6 ? 'var(--accent)' : value <= 4.5 ? 'var(--warn)' : 'var(--bad)';
  return el('span', {
    class: 'chip chip-difficulty',
    style: `color:${tone};border-color:${tone}`,
    title: `Difficulty ${value.toFixed(1)} — 3.0 is the real exam`,
    text: `difficulty ${value.toFixed(1)}`,
  });
}

export function citationBlock(citation) {
  const url = citation.url || '#';
  return el('a', { class: 'citation', href: url, target: '_blank', rel: 'noreferrer noopener' }, [
    el('div', { class: 'citation-label', text: 'Source in the Cilium docs' }),
    el('div', { class: 'citation-quote', text: `“${citation.quote}”` }),
    el('div', { class: 'citation-path', text: `${citation.file}#${citation.anchor}` }),
  ]);
}

export function optionButton(option, { disabled, state, onClick }) {
  const cls = ['option'];
  if (state === 'correct') cls.push('correct');
  if (state === 'incorrect') cls.push('incorrect');
  if (state === 'chosen') cls.push('chosen-neutral');
  return el(
    'button',
    {
      class: cls.join(' '),
      type: 'button',
      disabled: disabled || undefined,
      onclick: onClick,
    },
    [
      el('span', { class: 'option-letter', text: option.id }),
      el('span', { class: 'option-text' }, [richText(option.text)]),
    ],
  );
}

export function domainLabel(domain, labels) {
  return labels[domain]?.label ?? domain;
}

export function pct(n) {
  return `${Math.round(n)}%`;
}
