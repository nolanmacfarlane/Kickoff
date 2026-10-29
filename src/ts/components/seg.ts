// Segmented control: pick one of a few short options.
import { h } from '../dom';

export function seg<T extends string>(key: string, options: { value: T; label: string }[], current: T, onPick: (v: T) => void, locked = false): HTMLElement
{
  return h('div', { class: `seg ${locked ? 'seg--locked' : ''}`.trim(), role: 'group' },
    options.map((o) => h('button', {
      type: 'button', 'aria-pressed': o.value === current, disabled: locked, dataset: { key: `${key}-${o.value}` },
      onClick: () => onPick(o.value),
    }, o.label)));
}
