// Tiny DOM toolkit: element builder, formatting, toasts, modal. No framework.
import type { User } from './types';

export type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown>;
const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden']);

export function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** h('button', { class: 'btn', onClick: fn }, 'Label') */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const deferred: [string, unknown][] = [];
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'dataset') Object.assign(el.dataset, v as Record<string, string>);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (PROPS.has(k)) deferred.push([k, v]);          // set after children so <select value> works
    else if (k.startsWith('aria-')) el.setAttribute(k, String(v));
    else if (v === false) continue;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  for (const [k, v] of deferred) (el as unknown as Record<string, unknown>)[k] = v;
  return el;
}

export const go = (hash: string): void => { location.hash = hash; };

/** Re-render something while keeping keyboard focus on the control with the same data-key. */
export function keepFocus(fn: () => void): void {
  const key = (document.activeElement as HTMLElement | null)?.dataset?.key;
  fn();
  if (key) (document.querySelector(`[data-key="${key}"]`) as HTMLElement | null)?.focus();
}

// ---------- formatting ----------
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dayLabel(ts: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(new Date(ts)) - startOfDay(new Date(now))) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return dayFmt.format(ts);
}
export const fmtTime = (ts: number): string => timeFmt.format(ts);
export const fmtWhen = (start: number, end: number): string => `${dayLabel(start)}, ${timeFmt.format(start)} to ${timeFmt.format(end)}`;
export function fmtAgo(ts: number, now = Date.now()): string {
  const m = Math.round((now - ts) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
}
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name;
export const initials = (name: string): string => name.trim().charAt(0).toUpperCase();

export function avatar(user: Pick<User, 'name' | 'avatarColor'>, size: 'sm' | 'lg' | 'xl' | '' = ''): HTMLElement {
  return h('span', { class: `avatar${size ? ' avatar--' + size : ''}`, style: `background:${user.avatarColor}`, title: user.name, 'aria-hidden': 'true' }, initials(user.name));
}
export function tag(text: string, extra = ''): HTMLElement { return h('span', { class: `tag ${extra}`.trim() }, text); }

// ---------- toast ----------
export function toast(message: string): void {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const t = h('div', { class: 'toast', role: 'status' }, message);
  region.append(t);
  setTimeout(() => t.remove(), 3600);
}

// ---------- icons ----------
const ICONS = {
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6M12 7.6v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  help: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.8c0 1.6-2.4 2-2.4 3.4M12 17v.01" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  close: '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
} as const;
export function icon(name: keyof typeof ICONS): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  svg.innerHTML = ICONS[name];
  return svg;
}
export function iconButton(name: keyof typeof ICONS, label: string, onClick: () => void, extra = ''): HTMLButtonElement {
  return h('button', { class: `icon-btn ${extra}`.trim(), type: 'button', 'aria-label': label, title: label, onClick }, icon(name));
}

// ---------- modal ----------
let renderer: (() => HTMLElement | null) | null = null;
let backdrop: HTMLElement | null = null;
let returnFocus: HTMLElement | null = null;

export function openModal(render: () => HTMLElement | null, label = 'Details'): void {
  closeModal();
  renderer = render;
  returnFocus = document.activeElement as HTMLElement | null;
  const body = h('div', { class: 'modal__body' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: -1 },
    iconButton('close', 'Close', () => closeModal(), 'modal__close'), h('div', { class: 'modal__scroll' }, body));
  backdrop = h('div', { class: 'modal-backdrop', onClick: (e: Event) => { if (e.target === backdrop) closeModal(); } }, modal);
  document.getElementById('modal-root')!.append(backdrop);
  refreshModal();
  modal.focus();
}
export function refreshModal(): void {
  if (!backdrop || !renderer) return;
  const content = renderer();
  if (!content) { closeModal(); return; }
  const body = backdrop.querySelector('.modal__body')!;
  keepFocus(() => body.replaceChildren(content));
}
export function closeModal(): void {
  backdrop?.remove();
  backdrop = null; renderer = null;
  returnFocus?.focus?.(); returnFocus = null;
}

// ---------- confirmation dialog (sits above any open modal) ----------
export interface DialogAction { label: string; variant?: 'primary' | 'danger' | 'secondary'; onClick?: () => void }
let dialog: HTMLElement | null = null;
let dialogReturn: HTMLElement | null = null;

export function closeDialog(): void { dialog?.remove(); dialog = null; dialogReturn?.focus?.(); dialogReturn = null; }
/** Safest action first (it gets focus). */
export function confirmDialog(o: { title: string; body: string | Node; actions: DialogAction[] }): void {
  closeDialog();
  dialogReturn = document.activeElement as HTMLElement | null;
  const buttons = o.actions.map((a, i) => h('button', {
    type: 'button', class: `btn btn--${a.variant ?? 'secondary'}`, dataset: { key: `dlg-${i}` },
    onClick: () => { closeDialog(); a.onClick?.(); },
  }, a.label));
  const box = h('div', { class: 'modal modal--small', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-title', 'aria-describedby': 'dlg-body' },
    h('div', { class: 'modal__scroll stack' }, h('h2', { id: 'dlg-title' }, o.title), typeof o.body === 'string' ? h('p', { id: 'dlg-body' }, o.body) : h('div', { id: 'dlg-body' }, o.body), h('div', { class: 'dialog__actions' }, buttons)));
  dialog = h('div', { class: 'modal-backdrop modal-backdrop--top' }, box);
  document.getElementById('modal-root')!.append(dialog);
  buttons[0]?.focus();
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (dialog) closeDialog(); else closeModal();
});
