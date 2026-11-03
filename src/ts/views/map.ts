// Map tab: a full-page Leaflet map with floating filters (top left) and floating invite cards (right).
// Invites at the same place share one pin with a count. Selecting it lists those invites first.
// With the list hidden, selecting a pin opens a floating card just above it instead.
import * as L from 'leaflet';
import { inviteCard } from '../components/inviteCard';
import { uiIcon } from '../components/sportBits';
import { mapWidget } from '../components/mapWidget';
import { groupInvites, groupKey, groupPins, type PinGroup } from '../components/pinGroups';
import { sports } from '../data';
import { append, h, iconButton, keepFocus } from '../dom';
import { currentUser, getInvite, getSport, mapInvites } from '../state';
import type { Invite } from '../types';
import { openInvite } from './inviteDetail';
import { openSportInfo } from './sportInfo';
import { setRefresher } from '../nav';

const filters = { sport: 'all', time: 'any', gear: 'any' };   // survives re-renders and tab switches
const DAY = 86_400_000;
let listOpen = true;                                          // is the invites panel showing? (kept while you move between tabs)

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
  let promoted: string | null = null;                    // a pin with several invites picked ON THE MAP: its cards go first, under a heading
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
        selectedInvite = same ? null : g.invites[0].id; selectedGroup = same ? null : key; promoted = null;
      } else if (selectedGroup === key && selectedInvite === null) { selectedGroup = null; promoted = null; }   // several: show them all, click again to clear
      else { selectedGroup = key; selectedInvite = null; promoted = key; }
      update({ scrollList: true });
    },
  });
  // Floating card above the selected pin, used while the list is hidden. We open and close it ourselves.
  const popup = L.popup({ className: 'map-pop', closeButton: false, autoClose: false, closeOnClick: false, closeOnEscapeKey: false,
    offset: [0, -50], minWidth: 300, maxWidth: 320, autoPanPadding: [16, 16] });
  handle.map.on('click', () => { if (!listOpen && (selectedInvite || selectedGroup)) clearSelection(); });
  // The panel holds the filters (top) and the invite cards (below). A button on the map shows or hides the whole panel.
  const panel = h('aside', { class: 'map-panel', id: 'map-panel', 'aria-label': 'Filters and invites' }, filtersEl, sideEl);
  const toggle = h('button', { class: 'icon-btn icon-btn--on-map map-list-toggle', type: 'button', 'aria-controls': 'map-panel', dataset: { key: 'map-list-toggle' },
    onClick: () => { listOpen = !listOpen; applyOpen(); update(); } }, uiIcon('sidebar'));
  const stage = h('div', { class: 'map-page' }, handle.el, legend, toggle, panel);
  function applyOpen(): void {
    stage.classList.toggle('map-page--closed', !listOpen);
    panel.hidden = !listOpen;
    toggle.setAttribute('aria-expanded', String(listOpen));
    const label = listOpen ? 'Hide invite list' : 'Show invite list';
    toggle.setAttribute('aria-label', label); toggle.title = label;
    handle.map.invalidateSize();
  }
  applyOpen();

  function filterSelect(label: string, key: 'sport' | 'time' | 'gear', opts: [string, string][]): HTMLElement {
    return h('select', { class: 'select', value: filters[key], 'aria-label': label, dataset: { key: `f-${key}` },
      onChange: (e: Event) => { filters[key] = (e.target as HTMLSelectElement).value; selectedInvite = null; selectedGroup = null; promoted = null; update(); } },
      opts.map(([v, l]) => h('option', { value: v }, l)));
  }
  function clearSelection(): void { selectedInvite = null; selectedGroup = null; promoted = null; update(); }
  // From a card's map button: only the map moves. The list keeps its order and heading (no regrouping),
  // and the card is held at the same spot on screen.
  function showOnMap(i: Invite): void {
    selectedInvite = i.id; selectedGroup = groupKey(i);
    update({ anchor: i.id }); handle.focus(selectedGroup, true);
  }

  /** Scroll only the card list (never the page) so the card is fully visible. */
  function revealCard(card: HTMLElement): void {
    const c = card.getBoundingClientRect(), s = sideEl.getBoundingClientRect();
    if (c.top < s.top) sideEl.scrollTop += c.top - s.top;
    else if (c.bottom > s.bottom) sideEl.scrollTop += Math.min(c.bottom - s.bottom, c.top - s.top);
  }

  function drawPopup(group: PinGroup | undefined): void {
    const shown = !listOpen && group ? (selectedInvite ? group.invites.filter((i) => i.id === selectedInvite) : group.invites) : [];
    if (!shown.length || !group) { handle.map.closePopup(popup); return; }
    const many = shown.length > 1;
    const body = h('div', { class: 'map-pop__body' },
      h('div', { class: 'map-pop__head' },
        h('strong', {}, many ? `${shown.length} invites at ${group.label}` : group.label),
        iconButton('close', 'Close', clearSelection, 'icon-btn--sm')),
      h('div', { class: 'map-pop__cards' },
        shown.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id), onShowMap: false, onAbout: () => openSportInfo(i.sportId) }))));
    popup.setLatLng([group.lat, group.lng]).setContent(body);
    if (handle.map.hasLayer(popup)) popup.update();
    else handle.onSized(() => { if (popup.getContent() === body) handle.map.openPopup(popup); });   // autopan needs a sized map
  }

  /** Where a card sits relative to the top of the visible list, or null if it is not there. */
  const cardOffset = (id: string): number | null => {
    const card = sideEl.querySelector<HTMLElement>(`[data-invite="${id}"]`);
    return card ? card.getBoundingClientRect().top - sideEl.getBoundingClientRect().top : null;
  };

  function update(o: { scrollList?: boolean; anchor?: string } = {}): void {
    const list = mapInvites(me.id).filter(passesFilters);
    groups = groupInvites(list);
    if (selectedInvite && !list.some((i) => i.id === selectedInvite)) selectedInvite = null;
    if (selectedGroup && !groups.some((g) => g.key === selectedGroup)) { selectedGroup = null; selectedInvite = null; }
    if (promoted && !groups.some((g) => g.key === promoted)) promoted = null;
    handle.setPins(groupPins(groups, me), selectedGroup);
    const active = filters.sport !== 'all' || filters.time !== 'any' || filters.gear !== 'any';

    // Cards: invites at the selected pin come first, under a heading.
    const group = groups.find((g) => g.key === promoted && g.invites.length > 1);
    const ordered = group ? [...group.invites, ...list.filter((i) => !group.invites.includes(i))] : list;
    const isSelected = (i: Invite) => (selectedInvite ? i.id === selectedInvite : !!group && group.invites.includes(i));

    const scrollTop = sideEl.scrollTop;   // re-rendering the cards must not move the list
    const anchorAt = o.anchor ? cardOffset(o.anchor) : null;
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
      sideEl.scrollTop = scrollTop;
      if (anchorAt !== null) { const now = cardOffset(o.anchor!); if (now !== null) sideEl.scrollTop += now - anchorAt; }
    });
    // Picked on the map: bring its card into view in the list (a group's cards are at the top).
    if (o.scrollList && listOpen) {
      if (group) sideEl.scrollTop = 0;
      else if (selectedInvite) { const card = sideEl.querySelector<HTMLElement>(`[data-invite="${selectedInvite}"]`); if (card) revealCard(card); }
    }
    drawPopup(groups.find((g) => g.key === selectedGroup));
  }

  update();
  setRefresher(() => update());   // state changes (e.g. someone joins) redraw pins and cards, not the whole map
  if (selectedGroup) handle.focus(selectedGroup, true);   // arrived from "Show on map" elsewhere
  return stage;
}
