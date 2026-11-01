// Profile inputs shared by onboarding and the Profile tab. They edit a draft object, then call redraw().
import { geocode, motivationOptions, sampleCalendar, SKILLS, sports } from '../data';
import { append, h } from '../dom';
import type { BusyBlock, Motivation, Skill, Sport, User } from '../types';
import { seg } from './seg';
import { sportLabel, uiIcon } from './sportBits';

/** One entry per sport: "try" (want to try) or the user's skill level. Sports not in the object are not added. */
export type SportChoice = 'try' | Skill;
export interface ProfileDraft {
  name: string; address: string; motivations: Motivation[];
  sports: Record<string, SportChoice>; calendar: BusyBlock[] | null;
}
export const blankDraft = (): ProfileDraft => ({ name: '', address: '', motivations: [], sports: {}, calendar: null });
export const draftFromUser = (u: User): ProfileDraft => ({
  name: u.name, address: u.address, motivations: [...u.motivations],
  sports: { ...Object.fromEntries(u.desiredSports.map((id) => [id, 'try' as SportChoice])), ...Object.fromEntries(u.currentSports.map((s) => [s.sportId, s.skill as SportChoice])) },
  calendar: u.calendar ? u.calendar.map((b) => ({ ...b })) : null,
});
/** Turns the draft into a profile; the address goes through the fake lookup to find area and map position. */
export function draftToProfile(d: ProfileDraft): Omit<User, 'id' | 'avatarColor' | 'friendIds' | 'settings'> {
  const g = geocode(d.address);
  const entries = Object.entries(d.sports);
  return {
    name: d.name.trim(), address: d.address.trim(), area: g.area, lat: g.lat, lng: g.lng, motivations: d.motivations,
    currentSports: entries.filter(([, v]) => v !== 'try').map(([sportId, v]) => ({ sportId, skill: v as Skill })),
    desiredSports: entries.filter(([, v]) => v === 'try').map(([id]) => id), calendar: d.calendar,
  };
}

export function identityFields(d: ProfileDraft): HTMLElement {
  return h('div', { class: 'stack' },
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Your name'),
      h('input', { class: 'input', type: 'text', value: d.name, autocomplete: 'given-name', dataset: { key: 'name' }, onInput: (e: Event) => { d.name = (e.target as HTMLInputElement).value; } })),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Your address'),
      h('input', { class: 'input', type: 'text', value: d.address, autocomplete: 'street-address', placeholder: 'e.g. 1250 Fairfield Rd, Victoria', dataset: { key: 'address' },
        onInput: (e: Event) => { d.address = (e.target as HTMLInputElement).value; } }),
      h('span', { class: 'field__hint' }, 'Shows games close to you. Prototype: it is only matched to a neighbourhood, never sent anywhere.')));
}

export function motivationField(d: ProfileDraft, redraw: () => void): HTMLElement {
  return h('fieldset', {}, h('legend', {}, 'What are you looking for? Pick any.'),
    h('div', { class: 'choice-grid' }, motivationOptions.map((m) => h('button', {
      type: 'button', class: 'choice', 'aria-pressed': d.motivations.includes(m.id), dataset: { key: `mot-${m.id}` },
      onClick: () => { d.motivations = d.motivations.includes(m.id) ? d.motivations.filter((x) => x !== m.id) : [...d.motivations, m.id]; redraw(); },
    }, h('strong', {}, m.label), h('small', {}, m.hint)))));
}

const CHOICES: { value: SportChoice; label: string }[] = [{ value: 'try', label: 'Want to try' }, ...SKILLS.map((k) => ({ value: k as SportChoice, label: k }))];
const queries = new WeakMap<ProfileDraft, string>();   // the search text is not part of the profile, so it lives outside the draft

/** "Your sports" (added ones, with their level) above a search to add more. Pressing the chosen level again removes the sport. */
export function sportsField(d: ProfileDraft, redraw: () => void, onAbout: (sportId: string) => void): HTMLElement {
  const row = (s: Sport) => h('li', { class: 'sport-row' },
    h('div', { class: 'sport-row__name' }, sportLabel(s.id, { as: 'strong', onAbout: () => onAbout(s.id) }), h('small', {}, s.tagline)),
    seg<SportChoice>(`sport-${s.id}`, CHOICES, (d.sports[s.id] ?? '') as SportChoice,
      (v) => { if (d.sports[s.id] === v) delete d.sports[s.id]; else d.sports[s.id] = v; redraw(); }));

  const results = h('ul', { class: 'sport-list' });
  function fillResults(): void {
    const q = (queries.get(d) ?? '').trim().toLowerCase();
    const matches = sports.filter((s) => !(s.id in d.sports) && (!q || s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q)));
    results.replaceChildren();
    append(results, matches.length ? matches.map(row) : [h('li', { class: 'muted sport-row' }, q ? 'No sports match your search.' : 'You have added every sport.')]);
  }
  fillResults();

  const added = sports.filter((s) => s.id in d.sports);
  return h('div', { class: 'stack' },
    added.length ? h('div', {}, h('h3', {}, 'Your sports'), h('ul', { class: 'sport-list' }, added.map(row))) : null,
    h('div', {}, h('h3', {}, 'Add a sport'),
      h('label', { class: 'search-field' }, h('span', { class: 'sr-only' }, 'Search sports'), uiIcon('search'),
        h('input', { class: 'input', type: 'search', placeholder: 'Search sports', value: queries.get(d) ?? '', dataset: { key: 'sport-search' },
          onInput: (e: Event) => { queries.set(d, (e.target as HTMLInputElement).value); fillResults(); } })),
      results));
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hr = (n: number) => (n === 12 ? '12 pm' : n > 12 ? `${n - 12} pm` : `${n} am`);

export function calendarField(d: ProfileDraft, redraw: () => void): HTMLElement {
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
      h('span', { class: 'check__text' }, 'Sync my calendar', h('small', {}, 'Demo only: adds a made-up class and work schedule so we can suggest games when you are free.'))),
    grid);
}
