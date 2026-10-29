// Profile inputs shared by onboarding and the Profile tab. They edit a draft object, then call redraw().
import { areas, motivationOptions, sampleCalendar, sports } from '../data';
import { h } from '../dom';
import type { BusyBlock, Motivation, Skill, User } from '../types';
import { seg } from './seg';

export const SKILLS: Skill[] = ['Beginner', 'Intermediate', 'Advanced'];

export interface ProfileDraft
{
  name: string; area: string; motivations: Motivation[];
  current: Record<string, Skill>; desired: string[]; calendar: BusyBlock[] | null;
}
export const blankDraft = (): ProfileDraft => ({ name: '', area: '', motivations: [], current: {}, desired: [], calendar: null });
export const draftFromUser = (u: User): ProfileDraft => ({
  name: u.name, area: u.area, motivations: [...u.motivations],
  current: Object.fromEntries(u.currentSports.map((s) => [s.sportId, s.skill])), desired: [...u.desiredSports],
  calendar: u.calendar ? u.calendar.map((b) => ({ ...b })) : null,
});
export const draftToProfile = (d: ProfileDraft): Omit<User, 'id' | 'avatarColor' | 'friendIds'> => ({
  name: d.name.trim(), area: d.area, motivations: d.motivations,
  currentSports: Object.entries(d.current).map(([sportId, skill]) => ({ sportId, skill })),
  desiredSports: d.desired.filter((id) => !(id in d.current)), calendar: d.calendar,
});

export function identityFields(d: ProfileDraft): HTMLElement
{
  return h('div', { class: 'stack' },
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Your name'),
      h('input', { class: 'input', type: 'text', value: d.name, autocomplete: 'given-name', dataset: { key: 'name' }, onInput: (e: Event) => { d.name = (e.target as HTMLInputElement).value; } })),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Where do you usually play?'),
      h('select', { class: 'select', value: d.area, dataset: { key: 'area' }, onChange: (e: Event) => { d.area = (e.target as HTMLSelectElement).value; } },
        h('option', { value: '' }, 'Choose a neighbourhood'), areas.map((a) => h('option', { value: a }, a))),
      h('span', { class: 'field__hint' }, 'Used to show games close to you.')));
}

export function motivationField(d: ProfileDraft, redraw: () => void): HTMLElement
{
  return h('fieldset', {}, h('legend', {}, 'What are you looking for? Pick any.'),
    h('div', { class: 'choice-grid' }, motivationOptions.map((m) => h('button', {
      type: 'button', class: 'choice', 'aria-pressed': d.motivations.includes(m.id), dataset: { key: `mot-${m.id}` },
      onClick: () => { d.motivations = d.motivations.includes(m.id) ? d.motivations.filter((x) => x !== m.id) : [...d.motivations, m.id]; redraw(); },
    }, h('strong', {}, m.label), h('small', {}, m.hint)))));
}

export function currentSportsField(d: ProfileDraft, redraw: () => void): HTMLElement
{
  const chosen = Object.keys(d.current);
  return h('div', { class: 'stack' },
    h('div', { class: 'choice-grid' }, sports.map((s) => h('button', {
      type: 'button', class: 'choice', 'aria-pressed': s.id in d.current, dataset: { key: `cur-${s.id}` },
      onClick: () => { if (s.id in d.current) delete d.current[s.id]; else { d.current[s.id] = 'Beginner'; d.desired = d.desired.filter((x) => x !== s.id); } redraw(); },
    }, h('strong', {}, s.name), h('small', {}, s.tagline)))),
    chosen.length ? h('div', {}, h('p', { class: 'field__label' }, 'Your skill level in each'),
      chosen.map((id) => h('div', { class: 'skill-row' }, h('span', {}, sports.find((s) => s.id === id)!.name),
        seg(`skill-${id}`, SKILLS.map((k) => ({ value: k, label: k })), d.current[id], (v) => { d.current[id] = v; redraw(); })))) : null);
}

export function desiredSportsField(d: ProfileDraft, redraw: () => void): HTMLElement
{
  return h('div', { class: 'choice-grid' }, sports.filter((s) => !(s.id in d.current)).map((s) => h('button', {
    type: 'button', class: 'choice', 'aria-pressed': d.desired.includes(s.id), dataset: { key: `want-${s.id}` },
    onClick: () => { d.desired = d.desired.includes(s.id) ? d.desired.filter((x) => x !== s.id) : [...d.desired, s.id]; redraw(); },
  }, h('strong', {}, s.name), h('small', {}, s.tagline))));
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hr = (n: number) => (n === 12 ? '12 pm' : n > 12 ? `${n - 12} pm` : `${n} am`);

export function calendarField(d: ProfileDraft, redraw: () => void): HTMLElement
{
  const on = d.calendar !== null;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const grid = on ? h('div', { class: 'calendar-grid', role: 'img', 'aria-label': 'Weekly calendar with busy times shaded' },
    h('span', {}), order.map((day) => h('strong', {}, DAY_NAMES[day].slice(0, 3))),
    Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => [
      h('span', {}, hr(hour)),
      order.map((day) => h('span', { class: `cell ${d.calendar!.some((b) => b.day === day && b.startHour <= hour && hour < b.endHour) ? 'cell--busy' : ''}`.trim() })),
    ])) : null;
  return h('div', { class: 'stack' },
    h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: on, dataset: { key: 'cal' }, onChange: (e: Event) => { d.calendar = (e.target as HTMLInputElement).checked ? sampleCalendar.map((b) => ({ ...b })) : null; redraw(); } }),
      h('span', { class: 'check__text' }, 'Sync my calendar', h('small', {}, 'Demo only: adds a made-up class and work schedule. We use it to suggest games when you are free.'))),
    grid,
    on ? h('ul', { class: 'stack-sm muted' }, d.calendar!.map((b) => h('li', {}, `${DAY_NAMES[b.day]} ${hr(b.startHour)} to ${hr(b.endHour)}: ${b.label}`))) : null);
}
