// Home: suggested invites (highlighted matching tags + "why"), a close-up map of what is nearby, recent activity.
import { inviteCard } from '../components/inviteCard';
import { mapWidget } from '../components/mapWidget';
import { groupInvites, groupPins } from '../components/pinGroups';
import { firstName, fmtAgo, go, h } from '../dom';
import { distanceKm } from '../geo';
import { recommend } from '../match';
import { activityFor, currentUser, mapInvites } from '../state';
import { openInvite } from './inviteDetail';
import { openSportInfo } from './sportInfo';

export function render(): HTMLElement
{
  const me = currentUser()!;
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const recs = recommend(me, 5);
  const nearby = mapInvites(me.id);
  const closest = [...nearby].sort((a, b) => distanceKm(me, a.location) - distanceKm(me, b.location)).slice(0, 3);
  const activity = activityFor(me.id).slice(0, 5);

  // Close-up around you and the nearest invites. The whole map is one big link to the Map tab.
  const mini = mapWidget({
    key: 'mini', interactive: false, user: me, fitTo: [me, ...closest.map((i) => i.location)], maxZoom: 15,
    pins: groupPins(groupInvites(nearby), me),
  });

  return h('div', {},
    h('div', { class: 'greeting' }, h('h1', {}, `Good ${part}, ${firstName(me.name)}`), h('p', {}, 'Games around Victoria that fit what you told us.')),
    h('div', { class: 'cols' },
      h('section', { 'aria-labelledby': 'rec-h' },
        h('div', { class: 'section-head' }, h('h2', { id: 'rec-h' }, 'Suggested for you')),
        recs.length
          ? h('div', { class: 'rec-list' }, recs.map((r) => inviteCard(r.invite, me, {
            showWhy: true, onOpen: () => openInvite(r.invite.id), onShowMap: () => go(`#/map/${r.invite.id}`), onAbout: () => openSportInfo(r.invite.sportId)
          })))
          : h('div', { class: 'empty' }, h('h3', {}, 'No matching games yet'),
            h('p', {}, 'Nobody has posted a game for your sports. Start one and others will find it.'),
            h('a', { class: 'btn btn--primary', href: '#/create' }, 'Create an invite'))),
      h('div', { class: 'stack' },
        h('section', { 'aria-labelledby': 'near-h' },
          h('div', { class: 'section-head' }, h('h2', { id: 'near-h' }, 'Invites nearby')),
          h('div', { class: 'mini-map' }, mini.el, h('a', { class: 'mini-map__link', href: '#/map', 'aria-label': 'Open the map of nearby invites' }))),
        h('section', { 'aria-labelledby': 'act-h' },
          h('div', { class: 'section-head' }, h('h2', { id: 'act-h' }, 'Recent activity')),
          activity.length
            ? h('ul', { class: 'card activity-list' }, activity.map((a) => h('li', {}, h('span', {}, a.text), h('time', {}, fmtAgo(a.at)))))
            : h('div', { class: 'empty' }, 'Nothing yet. Join an invite and it will show up here.')))));
}