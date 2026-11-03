// "Unsaved changes" bar for pages that only apply edits when saved (Your profile, Personalization).
// It appears after the first edit, sticks to the bottom of the screen while you scroll, and goes away once
// you save or discard. The page's menu item gets a dot while there are unsaved changes.
import { h } from '../dom';

export interface SaveBar {
  el: HTMLElement;
  refresh: () => void;               // re-check for changes (show / hide the bar and the menu dot)
  setError: (msg: string) => void;   // shown in the bar, so it is on screen wherever you have scrolled to
}

/** The menu link for a section gets this marker while it has unsaved changes. */
export const unsavedMark = (show = false): HTMLElement => h('span', { class: 'unsaved-dot', hidden: !show }, h('span', { class: 'sr-only' }, 'Unsaved changes'));

export function saveBar(o: { section: string; isDirty: () => boolean; onSave: () => void; onDiscard: () => void }): SaveBar {
  const errorEl = h('p', { class: 'save-bar__error', role: 'alert', hidden: true });
  const el = h('div', { class: 'save-bar', role: 'region', 'aria-label': 'Unsaved changes', hidden: true },
    errorEl,   // above the buttons
    h('div', { class: 'save-bar__row' },
      h('p', { class: 'save-bar__msg', role: 'status' }, h('span', { class: 'save-bar__dot', 'aria-hidden': 'true' }), 'You have unsaved changes'),
      h('div', { class: 'save-bar__actions' },
        h('button', { class: 'btn btn--secondary btn--sm', type: 'button', dataset: { key: 'discard' }, onClick: o.onDiscard }, 'Discard'),
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', dataset: { key: 'save' }, onClick: o.onSave }, 'Save changes'))));

  let first = true;
  function refresh(): void {
    const dirty = o.isDirty();
    // Slide in only when it newly appears. A page rebuilt with changes already pending shows it straight away.
    el.classList.toggle('save-bar--enter', dirty && el.hidden && !first);
    first = false;
    el.hidden = !dirty;
    if (!dirty) errorEl.hidden = true;
    const mark = document.querySelector<HTMLElement>(`.menu-list [data-section="${o.section}"] .unsaved-dot`);
    if (mark) mark.hidden = !dirty;
  }
  return { el, refresh, setError: (msg) => { errorEl.textContent = msg; errorEl.hidden = !msg; } };
}

/** Re-check after any edit inside `root`. Handlers run first (the event bubbles up to root afterwards). */
export function watchEdits(root: HTMLElement, refresh: () => void): void {
  for (const type of ['input', 'change', 'click']) root.addEventListener(type, () => refresh());
}
