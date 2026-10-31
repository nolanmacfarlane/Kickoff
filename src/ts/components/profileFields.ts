// Profile inputs shared by onboarding and the Profile tab. They edit a draft object, then call redraw().
import { geocode, motivationOptions, sampleCalendar, SKILLS, sports } from '../data';
import { h } from '../dom';
import type { BusyBlock, Motivation, Skill, User } from '../types';

export interface ProfileDraft {
  name: string; address: string; motivations: Motivation[];
  current: Record<string, Skill>; desired: string[]; calendar: BusyBlock[] | null;
}
export const blankDraft = (): ProfileDraft => ({ name: '', address: '', motivations: [], current: {}, desired: [], calendar: null });
export const draftFromUser = (u: User): ProfileDraft => ({
  name: u.name, address: u.address, motivations: [...u.motivations],
  current: Object.fromEntries(u.currentSports.map((s) => [s.sportId, s.skill])), desired: [...u.desiredSports],
  calendar: u.calendar ? u.calendar.map((b) => ({ ...b })) : null,
});
/** Turns the draft into a profile; the address goes through the fake lookup to find area and map position. */
export function draftToProfile(d: ProfileDraft): Omit<User, 'id' | 'avatarColor' | 'friendIds' | 'settings'> {
  const g = geocode(d.address);
  return {
    name: d.name.trim(), address: d.address.trim(), area: g.area, lat: g.lat, lng: g.lng, motivations: d.motivations,
    currentSports: Object.entries(d.current).map(([sportId, skill]) => ({ sportId, skill })),
    desiredSports: d.desired.filter((id) => !(id in d.current)), calendar: d.calendar,
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

/** One list: each sport with its own skill levels. Pressing the chosen level again clears it. */
export function sportsPlayField(d: ProfileDraft, redraw: () => void): HTMLElement {
  return h('ul', { class: 'sport-list' }, sports.map((s) => h('li', { class: 'sport-row' },
    h('div', { class: 'sport-row__name' }, h('strong', {}, s.name), h('small', {}, s.tagline)),
    h('div', { class: 'seg', role: 'group', 'aria-label': `${s.name} skill level` }, SKILLS.map((k) => h('button', {
      type: 'button', 'aria-pressed': d.current[s.id] === k, dataset: { key: `play-${s.id}-${k}` },
      onClick: () => { if (d.current[s.id] === k) delete d.current[s.id]; else { d.current[s.id] = k; d.desired = d.desired.filter((x) => x !== s.id); } redraw(); },
    }, k))))));
}

/** Same list style, without skill levels. */
export function sportsWantField(d: ProfileDraft, redraw: () => void): HTMLElement {
  const rows = sports.filter((s) => !(s.id in d.current));
  return h('ul', { class: 'sport-list' }, rows.map((s) => {
    const on = d.desired.includes(s.id);
    return h('li', { class: 'sport-row' },
      h('div', { class: 'sport-row__name' }, h('strong', {}, s.name), h('small', {}, s.tagline)),
      h('button', { type: 'button', class: 'btn btn--secondary btn--toggle', 'aria-pressed': on, dataset: { key: `want-${s.id}` },
        onClick: () => { d.desired = on ? d.desired.filter((x) => x !== s.id) : [...d.desired, s.id]; redraw(); } }, on ? 'Added' : 'Add'));
  }));
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
