// Map tab: stylized Victoria with invite pins, filters for sport / time / gear, popup and side list.
import { inviteCard, inviteTags } from '../components/inviteCard';
import { mapWidget } from '../components/mapWidget';
import { sports } from '../data';
import { fmtWhen, h, keepFocus } from '../dom';
import { matchInvite } from '../match';
import { currentUser, getSport, mapInvites } from '../state';
import type { Invite } from '../types';
import { openInvite } from './inviteDetail';

const filters = { sport: 'all', time: 'any', gear: 'any' };   // survives re-renders and tab switches
const DAY = 86_400_000;

function passesTime(inv: Invite): boolean
{
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Math.floor((inv.start - start.getTime()) / DAY);
  if (filters.time === 'today') return days === 0;
  if (filters.time === 'tomorrow') return days === 1;
  if (filters.time === 'week') return days >= 0 && days < 7;
  return true;
}

export function render(args: string[]): HTMLElement
{
  const me = currentUser()!;
  let selected: string | null = args[0] ?? null;
  const root = h('div', {});

  function select(label: string, key: 'sport' | 'time' | 'gear', opts: [string, string][]): HTMLElement
  {
    return h('label', { class: 'field' }, h('span', { class: 'sr-only' }, label),
      h('select', {
        class: 'select', value: filters[key], 'aria-label': label, dataset: { key: `f-${key}` },
        onChange: (e: Event) => { filters[key] = (e.target as HTMLSelectElement).value; selected = null; draw(); }
      },
        opts.map(([v, l]) => h('option', { value: v }, l))));
  }

  function draw(): void
  {
    const list = mapInvites(me.id).filter((i) =>
      (filters.sport === 'all' || i.sportId === filters.sport) && passesTime(i) && (filters.gear === 'any' || i.gear.available));
    if (selected && !list.some((i) => i.id === selected)) selected = null;
    const sel = list.find((i) => i.id === selected);

    const mapEl = mapWidget({
      legend: true, selectedId: selected, onSelect: (id) => { selected = selected === id ? null : id; draw(); },
      pins: list.map((i) => ({
        id: i.id, x: i.location.x, y: i.location.y, glyph: getSport(i.sportId)!.name.charAt(0), label: `${getSport(i.sportId)!.name} at ${i.location.label}`,
        variant: matchInvite(i, me).keys.has('sport') ? 'match' : i.visibility === 'friends' ? 'friends' : undefined,
      })),
    });
    if (sel)
    {
      const side = sel.location.x > 60 ? 'map-pop--left' : sel.location.x < 20 ? 'map-pop--right' : sel.location.y < 30 ? 'map-pop--below' : '';
      mapEl.append(h('div', { class: `map-pop ${side}`.trim(), style: `left:${sel.location.x}%;top:${sel.location.y}%` },
        h('strong', {}, getSport(sel.sportId)!.name), h('span', { class: 'card__meta' }, fmtWhen(sel.start, sel.end)), inviteTags(sel, me),
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openInvite(sel.id) }, 'View details')));
    }

    keepFocus(() => root.replaceChildren(
      h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Map'), h('p', {}, `${list.length} open invite${list.length === 1 ? '' : 's'}. Full meetups are hidden.`))),
      h('div', { class: 'map-filters' },
        select('Sport', 'sport', [['all', 'All sports'], ...sports.map((s): [string, string] => [s.id, s.name])]),
        select('Time', 'time', [['any', 'Any time'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days']]),
        select('Gear', 'gear', [['any', 'Gear: any'], ['shared', 'Gear shared']]),
        filters.sport !== 'all' || filters.time !== 'any' || filters.gear !== 'any'
          ? h('button', { class: 'btn btn--text', type: 'button', onClick: () => { filters.sport = 'all'; filters.time = 'any'; filters.gear = 'any'; draw(); } }, 'Clear filters') : null),
      h('div', { class: 'map-layout' }, mapEl,
        h('div', { class: 'map-side' }, list.length
          ? list.map((i) => inviteCard(i, me, { selected: i.id === selected, onOpen: () => openInvite(i.id), onShowMap: () => { selected = i.id; draw(); } }))
          : h('div', { class: 'empty' }, h('h3', {}, 'No invites match'), h('p', {}, 'Try another sport or time, or start the game yourself.'),
            h('a', { class: 'btn btn--primary', href: '#/create' }, 'Create an invite'))))));
  }

  draw();
  return root;
}
