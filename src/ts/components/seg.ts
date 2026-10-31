// Segmented controls. Both are as wide as their buttons (not the whole container).
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

/** Pick any number. Order of the result follows the order of the options. */
export function segMulti<T extends string>(key: string, options: Option<T>[], selected: T[], onChange: (v: T[]) => void): HTMLElement {
  return h('div', { class: 'seg', role: 'group' },
    options.map((o) => h('button', {
      type: 'button', 'aria-pressed': selected.includes(o.value), dataset: { key: `${key}-${o.value}` },
      onClick: () => onChange(options.map((x) => x.value).filter((v) => (v === o.value ? !selected.includes(v) : selected.includes(v)))),
    }, o.label)));
}
