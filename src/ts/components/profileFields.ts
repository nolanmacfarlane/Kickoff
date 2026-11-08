// Profile inputs shared by onboarding and the Profile tab. They edit a draft object, then call redraw().
import { freeTimeOptions, geocode, motivationOptions, sampleCalendar, SKILLS, sportCategories, sportMatches, sports } from '../data';
import { append, fmtHour, h, iconButton } from '../dom';
import { MAX_NAME_LENGTH } from '../state';
import type { BusyBlock, FreeTime, Motivation, Skill, Sport, User } from '../types';
import { segMulti, toggleBox } from './seg';
import { sportIcon, sportLabel, uiIcon } from './sportBits';

/** One entry per added sport: "try" (want to try), a skill level, or "unset" right after adding. Sports not in the object are not added. */
export type SportChoice = 'try' | Skill | 'unset';   // 'unset' = just added, level not chosen yet
export interface ProfileDraft {
  name: string; address: string; motivations: Motivation[];
  sports: Record<string, SportChoice>; calendar: BusyBlock[] | null; freeTimes: FreeTime[];
}
export const blankDraft = (): ProfileDraft => ({ name: '', address: '', motivations: [], sports: {}, calendar: null, freeTimes: [] });
export const draftFromUser = (u: User): ProfileDraft => ({
  name: u.name, address: u.address, motivations: [...u.motivations],
  sports: { ...Object.fromEntries(u.desiredSports.map((id) => [id, 'try' as SportChoice])), ...Object.fromEntries(u.currentSports.map((s) => [s.sportId, s.skill as SportChoice])) },
  calendar: u.calendar ? u.calendar.map((b) => ({ ...b })) : null, freeTimes: [...u.freeTimes],
});
/** Turns the draft into a profile; the address goes through the fake lookup to find area and map position. */
export function draftToProfile(d: ProfileDraft): Omit<User, 'id' | 'avatarColor' | 'friendIds' | 'settings'> {
  const g = geocode(d.address);
  const entries = Object.entries(d.sports);
  return {
    name: d.name.trim(), address: d.address.trim(), area: g.area, lat: g.lat, lng: g.lng, motivations: d.motivations,
    currentSports: entries.filter(([, v]) => v !== 'try' && v !== 'unset').map(([sportId, v]) => ({ sportId, skill: v as Skill })),
    desiredSports: entries.filter(([, v]) => v === 'try').map(([id]) => id), calendar: d.calendar, freeTimes: d.freeTimes,
  };
}

export function identityFields(d: ProfileDraft): HTMLElement {
  return h('div', { class: 'stack' },
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Your name'),
      h('input', { class: 'input', type: 'text', value: d.name, maxlength: MAX_NAME_LENGTH, autocomplete: 'given-name', dataset: { key: 'name' }, onInput: (e: Event) => { d.name = (e.target as HTMLInputElement).value; } })),
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
    }, toggleBox(), h('span', { class: 'choice__text' }, h('strong', {}, m.label), h('small', {}, m.hint))))));
}

const LEVELS: { value: SportChoice; label: string }[] = [{ value: 'try', label: 'Want to try' }, ...SKILLS.map((k) => ({ value: k as SportChoice, label: k }))];
const queries = new WeakMap<ProfileDraft, string>();   // the search text is not part of the profile, so it lives outside the draft

/** Names of sports that were added but have no level yet. Onboarding and Save use this to ask for one. */
export const pendingSports = (d: ProfileDraft): string[] =>
  Object.entries(d.sports).filter(([, v]) => v === 'unset').map(([id]) => sports.find((s) => s.id === id)!.name);

let comboId = 0;

/**
 * Add, then one dropdown. Search for a sport (by name or another name people use, like "biking") in a type-ahead box: matches float directly under the box (they do
 * not push the page around, like LinkedIn's skill search). Choose one to add it to "Your sports", where a level
 * dropdown (Want to try, or a skill level) and an x button live. Nothing is listed until you type.
 * With categories (onboarding), "Not sure?" cards add a whole group of sports as Want to try.
 */
export function sportsField(d: ProfileDraft, redraw: () => void, onAbout: (sportId: string) => void, opts: { categories?: boolean } = {}): HTMLElement {
  const listId = `sport-results-${++comboId}`;
  const info = (s: Sport) => h('div', { class: 'sport-row__name' }, sportLabel(s.id, { as: 'strong', onAbout: () => onAbout(s.id) }), h('small', {}, s.tagline));

  function add(id: string): void {
    d.sports[id] = 'unset';
    queries.set(d, '');
    redraw();
    setTimeout(() => {   // jump to the new row's dropdown, and open it where the browser allows
      const select = document.querySelector<HTMLSelectElement>(`[data-key="level-${id}"]`);
      select?.focus();
      try { select?.showPicker?.(); } catch { /* needs a fresh user gesture in some browsers; focus is enough */ }
    }, 0);
  }

  const levelSelect = (s: Sport) => {
    const current = d.sports[s.id];
    return h('select', { class: 'select select--level', 'aria-label': `${s.name} level`, dataset: { key: `level-${s.id}` }, value: current === 'unset' ? '' : current,
      onChange: (e: Event) => { d.sports[s.id] = (e.target as HTMLSelectElement).value as SportChoice; redraw(); } },
      current === 'unset' ? h('option', { value: '', disabled: true }, 'Choose level') : null,
      LEVELS.map((o) => h('option', { value: o.value }, o.label)));
  };
  const controls = (s: Sport) => h('div', { class: 'sport-row__controls' }, levelSelect(s),
    iconButton('close', `Remove ${s.name}`, () => { delete d.sports[s.id]; redraw(); }));

  // ----- the search box and its floating list of matches -----
  let matches: Sport[] = [];
  let active = -1;
  const popup = h('div', { class: 'search-popup', role: 'listbox', id: listId, 'aria-label': 'Matching sports', hidden: true });
  const input = h('input', {
    class: 'input', type: 'search', role: 'combobox', placeholder: 'Search sports', 'aria-label': 'Search sports', autocomplete: 'off',
    'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': listId, value: queries.get(d) ?? '', dataset: { key: 'sport-search' },
    onInput: (e: Event) => { queries.set(d, (e.target as HTMLInputElement).value); fillResults(); },
    onFocus: () => fillResults(),
    onBlur: () => close(),
    onKeydown: (e: Event) => onKey(e as KeyboardEvent),
  });

  function close(): void { popup.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function setActive(i: number): void {
    active = i;
    Array.from(popup.children).forEach((el, idx) => { el.classList.toggle('search-option--active', idx === i); el.setAttribute('aria-selected', String(idx === i)); });
    const el = popup.children[i] as HTMLElement | undefined;
    if (el) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView?.({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
  }
  function fillResults(): void {
    const q = (queries.get(d) ?? '').trim().toLowerCase();
    popup.replaceChildren(); matches = []; active = -1;
    if (!q) { close(); return; }                              // nothing is listed until the person types
    matches = sports.filter((s) => !(s.id in d.sports) && sportMatches(s, q));
    popup.hidden = false; input.setAttribute('aria-expanded', 'true');
    if (!matches.length) { append(popup, [h('div', { class: 'search-popup__empty' }, 'No sports match your search.')]); return; }
    append(popup, matches.map((s, i) => h('div', {
      class: 'search-option', role: 'option', id: `${listId}-${i}`, 'aria-selected': 'false', dataset: { key: `add-${s.id}` },
      onMouseDown: (e: Event) => e.preventDefault(),         // keep focus in the search box while clicking
      onClick: () => add(s.id),
    }, sportIcon(s.id), h('span', { class: 'search-option__text' }, h('strong', {}, s.name), h('small', {}, s.tagline)), h('span', { class: 'search-option__add' }, '+ Add'))));
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!matches.length) return;
      e.preventDefault(); popup.hidden = false;
      setActive(e.key === 'ArrowDown' ? Math.min(matches.length - 1, active + 1) : Math.max(0, active - 1));
    } else if (e.key === 'Enter') {
      const pick = active >= 0 ? matches[active] : matches.length === 1 ? matches[0] : undefined;   // Enter adds the highlighted match, or the only one
      if (pick) { e.preventDefault(); add(pick.id); }
    } else if (e.key === 'Escape' && !popup.hidden) { e.preventDefault(); e.stopPropagation(); close(); }
  }
  fillResults(); close();

  // On when all its sports are added. Turning one off removes only its sports still at Want to try, so levels people chose are kept.
  const categories = opts.categories ? h('fieldset', { class: 'stack-sm' }, h('legend', {}, 'Not sure? Pick a type and we will add some sports to try.'),
    h('div', { class: 'choice-grid' }, sportCategories.map((c) => {
      const on = c.sportIds.every((id) => id in d.sports);
      return h('button', {
        type: 'button', class: 'choice', 'aria-pressed': on, dataset: { key: `cat-${c.id}` },
        onClick: () => {
          for (const id of c.sportIds) {
            if (!on && !(id in d.sports)) d.sports[id] = 'try';
            else if (on && d.sports[id] === 'try') delete d.sports[id];
          }
          redraw();
        },
      }, toggleBox(), h('span', { class: 'choice__text' }, h('strong', {}, c.label), h('small', {}, c.hint)));
    }))) : null;

  const added = sports.filter((s) => s.id in d.sports);
  return h('div', { class: 'stack' },
    h('div', { class: 'stack-sm' }, h('h3', {}, 'Add a sport'), h('div', { class: 'search-field' }, uiIcon('search'), input, popup)),
    categories,
    h('div', { class: added.length ? '' : 'stack-sm' }, h('h3', {}, 'Your sports'),
      added.length ? h('ul', { class: 'sport-list' }, added.map((s) => h('li', { class: 'sport-row' }, info(s), controls(s))))
        : h('div', { class: 'empty empty--tight' }, 'No sports yet. Search above to add one.')));
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** weekStart: 0 = Sunday first, 1 = Monday first (Personalization setting). */
export function calendarField(d: ProfileDraft, redraw: () => void, weekStart: 0 | 1 = 1): HTMLElement {
  const on = d.calendar !== null;
  const order = Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7);
  const grid = on ? h('div', { class: 'calendar-grid', role: 'img', 'aria-label': 'Weekly calendar with busy times shaded' },
    h('span', {}), order.map((day) => h('strong', {}, DAY_NAMES[day].slice(0, 3))),
    Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => [
      h('span', {}, fmtHour(hour)),
      order.map((day) => h('span', { class: `cell ${d.calendar!.some((b) => b.day === day && b.startHour <= hour && hour < b.endHour) ? 'cell--busy' : ''}`.trim() })),
    ])) : null;
  return h('div', { class: 'stack' },
    h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: on, dataset: { key: 'cal' }, onChange: (e: Event) => { d.calendar = (e.target as HTMLInputElement).checked ? sampleCalendar.map((b) => ({ ...b })) : null; redraw(); } }),
      h('span', { class: 'check__text' }, 'Sync my calendar', h('small', {}, 'Demo only: adds a made-up class and work schedule so we can suggest games when you are free.'))),
    grid ?? freeTimeField(d, redraw));
}

/** Shown when the calendar is not synced: rough "usually free" times, one row for weekdays and one for weekends. */
function freeTimeField(d: ProfileDraft, redraw: () => void): HTMLElement {
  const row = (weekend: boolean) => {
    const opts = freeTimeOptions.filter((o) => o.weekend === weekend);
    const mine = (v: FreeTime) => opts.some((o) => o.id === v);
    return h('div', { class: 'field' }, h('span', { class: 'field__label' }, weekend ? 'Weekends' : 'Weekdays'),
      segMulti(weekend ? 'free-weekend' : 'free-weekday', opts.map((o) => ({ value: o.id, label: o.label })), d.freeTimes.filter(mine),
        (picked) => { d.freeTimes = [...d.freeTimes.filter((v) => !mine(v)), ...picked]; redraw(); }));
  };
  return h('fieldset', { class: 'stack-sm' }, h('legend', {}, 'Or pick when you are usually free'), row(false), row(true));
}
