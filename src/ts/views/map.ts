// Map tab: a full-page Leaflet map with floating filters (top left) and floating invite cards (right).
// Invites at the same place share one pin with a count. Selecting it lists those invites first.
import { inviteCard } from '../components/inviteCard';
import { mapWidget } from '../components/mapWidget';
import { groupInvites, groupKey, groupPins, type PinGroup } from '../components/pinGroups';
import { sports } from '../data';
import { append, h, iconButton, keepFocus } from '../dom';
import { currentUser, getInvite, getSport, mapInvites } from '../state';
import type { Invite } from '../types';
import { openInvite } from './inviteDetail';
import { openSportInfo } from './sportInfo';

const filters = { sport: 'all', time: 'any', gear: 'any' };   // survives re-renders and tab switches
const DAY = 86_400_000;

function passesTime(inv: Invite): boolean {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Math.floor((inv.start - start.getTime()) / DAY);
  if (filters.time === 'today') return days === 0;
  if (filters.time === 'tomorrow') return days === 1;
  if (filters.time === 'week') return days >= 0 && days < 7;
  return true;
}
const passesFilters = (i: Invite) =>
  (filters.sport === 'all' || i.sportId === filters.sport) && passesTime(i) && (filters.gear === 'any' || i.gear.available);

export function render(args: string[]): HTMLElement {
  const me = currentUser()!;
  let selectedInvite: string | null = args[0] ?? null;   // one invite (highlighted card)
  let selectedGroup: string | null = null;               // the pin it belongs to
  let groups: PinGroup[] = [];
  const filtersEl = h('div', { class: 'map-filters' });
  const legend = h('div', { class: 'map-legend', 'aria-label': 'Map legend', role: 'group' },
    h('span', { class: 'legend-item' }, h('i', { class: 'legend-dot legend-dot--match' }), 'Matches your profile'),
    h('span', { class: 'legend-item' }, h('i', { class: 'legend-dot' }), 'Other invites'),
    h('span', { class: 'legend-item' }, h('i', { class: 'legend-dot legend-dot--friends' }), 'Friends only'),
    h('span', { class: 'legend-item' }, h('i', { class: 'legend-dot legend-dot--count' }, '3'), 'Several invites here'),
    h('span', { class: 'legend-item' }, h('i', { class: 'legend-dot legend-dot--you' }), 'You are here'));
  const sideEl = h('div', { class: 'map-side' });

  // Arriving from "Show on map": if an old filter would hide that invite, clear the filters so it can be shown.
  const wanted = selectedInvite ? getInvite(selectedInvite) : undefined;
  if (wanted) {
    selectedGroup = groupKey(wanted);
    if (!passesFilters(wanted)) { filters.sport = 'all'; filters.time = 'any'; filters.gear = 'any'; }
  }

  const handle = mapWidget({
    key: 'main', user: me, zoom: 13, remember: true, pins: [],
    onSelect: (key) => {
      const g = groups.find((x) => x.key === key);
      if (!g) return;
      if (g.invites.length === 1) {                       // one invite here: select it (click again to deselect)
        const same = selectedInvite === g.invites[0].id;
        selectedInvite = same ? null : g.invites[0].id; selectedGroup = same ? null : key;
      } else if (selectedGroup === key && selectedInvite === null) selectedGroup = null;   // several: show them all, click again to clear
      else { selectedGroup = key; selectedInvite = null; }
      update();
    },
  });
  const stage = h('div', { class: 'map-page' }, handle.el, filtersEl, legend, sideEl);

  function filterSelect(label: string, key: 'sport' | 'time' | 'gear', opts: [string, string][]): HTMLElement {
    return h('select', { class: 'select', value: filters[key], 'aria-label': label, dataset: { key: `f-${key}` },
      onChange: (e: Event) => { filters[key] = (e.target as HTMLSelectElement).value; selectedInvite = null; selectedGroup = null; update(); } },
      opts.map(([v, l]) => h('option', { value: v }, l)));
  }
  function clearSelection(): void { selectedInvite = null; selectedGroup = null; update(); }
  function showOnMap(i: Invite): void { selectedInvite = i.id; selectedGroup = groupKey(i); update(); handle.focus(selectedGroup, true); }

  function update(): void {
    const list = mapInvites(me.id).filter(passesFilters);
    groups = groupInvites(list);
    if (selectedInvite && !list.some((i) => i.id === selectedInvite)) selectedInvite = null;
    if (selectedGroup && !groups.some((g) => g.key === selectedGroup)) { selectedGroup = null; selectedInvite = null; }
    handle.setPins(groupPins(groups, me), selectedGroup);
    const active = filters.sport !== 'all' || filters.time !== 'any' || filters.gear !== 'any';

    // Cards: invites at the selected pin come first, under a heading.
    const group = groups.find((g) => g.key === selectedGroup && g.invites.length > 1);
    const ordered = group ? [...group.invites, ...list.filter((i) => !group.invites.includes(i))] : list;
    const isSelected = (i: Invite) => (selectedInvite ? i.id === selectedInvite : !!group && group.invites.includes(i));

    keepFocus(() => {
      filtersEl.replaceChildren();
      append(filtersEl, [
        h('span', { class: 'select-help' }, filterSelect('Sport', 'sport', [['all', 'All sports'], ...sports.map((s): [string, string] => [s.id, s.name])]),
          filters.sport !== 'all' ? iconButton('help', `About ${getSport(filters.sport)!.name}`, () => openSportInfo(filters.sport), 'icon-btn--on-map') : null),
        filterSelect('Time', 'time', [['any', 'Any time'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days']]),
        filterSelect('Gear', 'gear', [['any', 'Gear: any'], ['shared', 'Gear shared']]),
        active ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => { filters.sport = 'all'; filters.time = 'any'; filters.gear = 'any'; clearSelection(); } }, 'Clear filters') : null]);
      sideEl.replaceChildren();
      append(sideEl, ordered.length ? [
        group ? h('div', { class: 'card card--tight map-group-head' }, h('strong', {}, `${group.invites.length} invites at ${group.label}`),
          h('button', { class: 'btn btn--text btn--sm', type: 'button', onClick: clearSelection }, 'Show all')) : null,
        ...ordered.map((i) => inviteCard(i, me, { selected: isSelected(i), onOpen: () => openInvite(i.id), onShowMap: () => showOnMap(i), onAbout: () => openSportInfo(i.sportId) })),
      ] : [h('div', { class: 'card empty' }, h('h3', {}, 'No invites match'), h('p', {}, 'Try another sport or time, or start the game yourself.'),
            h('a', { class: 'btn btn--primary', href: '#/create' }, 'Create an invite'))]);
    });
    const focusId = selectedInvite ?? group?.invites[0].id;
    if (focusId) sideEl.querySelector(`[data-invite="${focusId}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }

  update();
  if (selectedGroup) handle.focus(selectedGroup, true);   // arrived from "Show on map" elsewhere
  return stage;
}
