// Home: recommended invites (with highlighted matching tags and "why"), nearby mini map, recent activity.
import { inviteCard } from '../components/inviteCard';
import { mapWidget } from '../components/mapWidget';
import { firstName, fmtAgo, go, h } from '../dom';
import { matchInvite, recommend } from '../match';
import { activityFor, currentUser, getSport, mapInvites } from '../state';
import { openInvite } from './inviteDetail';

export function render(): HTMLElement
{
  const me = currentUser()!;
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const recs = recommend(me, 5);
  const nearby = mapInvites(me.id);
  const activity = activityFor(me.id).slice(0, 5);

  const pins = nearby.map((i) => ({
    id: i.id, x: i.location.x, y: i.location.y, glyph: getSport(i.sportId)!.name.charAt(0), label: `${getSport(i.sportId)!.name} at ${i.location.label}`,
    variant: matchInvite(i, me).keys.has('sport') ? ('match' as const) : i.visibility === 'friends' ? ('friends' as const) : undefined,
  }));

  return h('div', {},
    h('div', { class: 'greeting' }, h('h1', {}, `Good ${part}, ${firstName(me.name)}`), h('p', {}, 'Games happening around Victoria that fit what you told us.')),
    h('div', { class: 'cols' },
      h('section', { 'aria-labelledby': 'rec-h' },
        h('div', { class: 'section-head' }, h('h2', { id: 'rec-h' }, 'Suggested for you')),
        recs.length
          ? h('div', { class: 'rec-list' }, recs.map((r) => inviteCard(r.invite, me, {
            showWhy: true, onOpen: () => openInvite(r.invite.id), onShowMap: () => go(`#/map/${r.invite.id}`)
          })))
          : h('div', { class: 'empty' }, h('h3', {}, 'No matching games yet'),
            h('p', {}, 'Nobody has posted a game for your sports. Start one and others will find it.'),
            h('a', { class: 'btn btn--primary', href: '#/create' }, 'Create an invite'))),
      h('div', { class: 'stack' },
        h('section', { 'aria-labelledby': 'near-h' },
          h('div', { class: 'section-head' }, h('h2', { id: 'near-h' }, 'Invites nearby'), h('a', { href: '#/map' }, 'Open full map')),
          h('div', { class: 'mini-map' }, mapWidget({ pins, legend: false, onSelect: (id) => go(`#/map/${id}`) }))),
        h('section', { 'aria-labelledby': 'act-h' },
          h('div', { class: 'section-head' }, h('h2', { id: 'act-h' }, 'Recent activity')),
          activity.length
            ? h('ul', { class: 'card activity-list' }, activity.map((a) => h('li', {}, h('span', {}, a.text), h('time', {}, fmtAgo(a.at)))))
            : h('div', { class: 'empty' }, 'Nothing yet. Join an invite and it will show up here.')))));
}
