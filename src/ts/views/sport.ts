// Sport page: what it is, gear needed, where to rent, how to start, and live invites (incl. gear to borrow).
import { inviteCard } from '../components/inviteCard';
import { venues } from '../data';
import { go, h, tag } from '../dom';
import { currentUser, getSport, mapInvites } from '../state';
import { openInvite } from './inviteDetail';
import { presetSport } from './create';

export function render(args: string[]): HTMLElement
{
  const me = currentUser()!;
  const sport = getSport(args[0] ?? '');
  if (!sport) return h('div', { class: 'empty' }, h('h3', {}, 'Sport not found'), h('a', { class: 'btn btn--primary', href: '#/home' }, 'Back to home'));

  const live = mapInvites(me.id).filter((i) => i.sportId === sport.id);
  const borrow = live.filter((i) => i.gear.available);
  const places = venues.filter((v) => v.sportIds.includes(sport.id));
  const cards = (list: typeof live) => list.map((i) => inviteCard(i, me, { showWhy: false, onOpen: () => openInvite(i.id), onShowMap: () => go(`#/map/${i.id}`) }));

  return h('div', {},
    h('div', { class: 'sport-hero' }, h('h1', {}, sport.name), h('p', {}, sport.description),
      h('div', { class: 'tags' }, tag(sport.typicalGroup), tag(sport.soloFriendly ? 'Individual sport, done together' : 'Team or partner game')),
      h('div', {}, h('button', { class: 'btn btn--primary', type: 'button', onClick: () => { presetSport(sport.id); go('#/create'); } }, `Create a ${sport.name} invite`))),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' },
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'What you need')),
          h('ul', { class: 'gear-list' }, sport.gear.map((g) => h('li', { class: 'gear-item' }, h('span', { class: 'gear-item__name' }, g.item),
            tag(g.required ? 'Needed' : 'Optional', g.required ? 'tag--match' : ''), h('span', { class: 'gear-item__note' }, g.note))))),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Where to rent or borrow')),
          h('ul', { class: 'gear-list' },
            places.filter((v) => v.rentals.length).map((v) => h('li', { class: 'gear-item' }, h('span', { class: 'gear-item__name' }, v.name), tag('Rent on site', 'tag--gear'), h('span', { class: 'gear-item__note' }, `${v.rentals.join(', ')}. ${v.hours}.`))),
            borrow.length ? h('li', { class: 'gear-item' }, h('span', { class: 'gear-item__name' }, 'Borrow from another player'), tag('Free', 'tag--gear'), h('span', { class: 'gear-item__note' }, `${borrow.length} upcoming invite${borrow.length === 1 ? '' : 's'} with gear to share. See below.`)) : null,
            !places.some((v) => v.rentals.length) && !borrow.length ? h('li', { class: 'empty' }, 'No rentals or shared gear for this sport right now.') : null)),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'How to start')), h('ol', { class: 'steps' }, sport.howToStart.map((s) => h('li', {}, s))))),
      h('section', { class: 'stack' },
        h('div', { class: 'section-head' }, h('h2', {}, `Open ${sport.name} invites`)),
        borrow.length ? h('div', { class: 'stack-sm' }, h('h3', {}, 'With gear to share'), cards(borrow)) : null,
        live.length ? h('div', { class: 'stack-sm' }, borrow.length ? h('h3', {}, 'All invites') : null, cards(live))
          : h('div', { class: 'empty' }, h('h3', {}, 'No open invites'), h('p', {}, `Be the first to start a ${sport.name} game.`)))));
}
