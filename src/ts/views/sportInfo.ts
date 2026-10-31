// "About this sport" popup. Reached from the (?) next to a sport name, Create invite, and the map's sport filter.
import { venues } from '../data';
import { fmtWhen, h, openModal, tag } from '../dom';
import { currentUser, getSport, mapInvites } from '../state';
import { openInvite } from './inviteDetail';

export function openSportInfo(sportId: string): void {
  const sport = getSport(sportId);
  if (!sport) return;
  openModal(() => view(sportId), `About ${sport.name}`);
}

function view(sportId: string): HTMLElement | null {
  const me = currentUser();
  const sport = getSport(sportId);
  if (!me || !sport) return null;
  const rentals = venues.filter((v) => v.sportIds.includes(sport.id) && v.rentals.length);
  const sharing = mapInvites(me.id).filter((i) => i.sportId === sport.id && i.gear.available);

  return h('div', { class: 'detail' },
    h('div', { class: 'detail__head' }, h('div', { class: 'grow' }, h('h2', {}, sport.name), h('p', { class: 'card__meta' }, sport.description))),
    h('div', { class: 'tags' }, tag(sport.typicalGroup), tag(sport.soloFriendly ? 'Individual sport, done together' : 'Team or partner game')),
    h('section', {}, h('h3', {}, 'What you need'),
      h('ul', { class: 'gear-list' }, sport.gear.map((g) => h('li', { class: 'gear-item' }, h('span', { class: 'gear-item__name' }, g.item),
        tag(g.required ? 'Needed' : 'Optional', g.required ? 'tag--match' : ''), h('span', { class: 'gear-item__note' }, g.note))))),
    h('section', {}, h('h3', {}, 'Where to borrow'),
      rentals.length || sharing.length
        ? h('ul', { class: 'gear-list' },
            rentals.map((v) => h('li', { class: 'gear-item' }, h('span', { class: 'gear-item__name' }, v.name), tag('Rental', 'tag--gear'),
              h('span', { class: 'gear-item__note' }, `${v.rentals.join(', ')}. ${v.hours}.`))),
            sharing.map((i) => h('li', { class: 'gear-item' }, h('span', { class: 'gear-item__name' }, i.gear.description), tag('Free', 'tag--gear'),
              h('span', { class: 'gear-item__note' }, `${fmtWhen(i.start, i.end)}, ${i.location.label}`),
              h('button', { class: 'btn btn--secondary btn--sm gear-item__action', type: 'button', onClick: () => openInvite(i.id) }, 'View invite'))))
        : h('p', { class: 'muted' }, 'No rentals or shared gear for this sport right now.')));
}
