// Two kinds of "pick" controls that deliberately look different:
//   seg      pick exactly ONE  -> a joined segmented bar (like radio buttons)
//   segMulti pick ANY number   -> separate chips, each with a checkbox (like checkboxes)
import { h } from '../dom';

type Option<T> = { value: T; label: string };

/** Pick exactly one. */
export function seg<T extends string>(key: string, options: Option<T>[], current: T, onPick: (v: T) => void, locked = false): HTMLElement {
  return h('div', { class: `seg ${locked ? 'seg--locked' : ''}`.trim(), role: 'group' },
    options.map((o) => h('button', {
      type: 'button', 'aria-pressed': o.value === current, disabled: locked, dataset: { key: `${key}-${o.value}` },
      onClick: () => onPick(o.value),
    }, o.label)));
}

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/** The little checkbox that marks "you can pick several". Filled with a tick when pressed. */
export function toggleBox(): HTMLElement { const box = h('span', { class: 'toggle__box' }); box.innerHTML = CHECK; return box; }

/** Pick any number. Order of the result follows the order of the options. */
export function segMulti<T extends string>(key: string, options: Option<T>[], selected: T[], onChange: (v: T[]) => void): HTMLElement {
  return h('div', { class: 'toggle-group', role: 'group' },
    options.map((o) => h('button', {
      type: 'button', class: 'toggle', 'aria-pressed': selected.includes(o.value), dataset: { key: `${key}-${o.value}` },
      onClick: () => onChange(options.map((x) => x.value).filter((v) => (v === o.value ? !selected.includes(v) : selected.includes(v)))),
    }, toggleBox(), o.label)));
}
