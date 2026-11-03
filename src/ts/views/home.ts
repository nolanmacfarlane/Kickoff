// Home: suggested invites (max 3), a close-up map of what is nearby, what friends are going to, recent activity.
import { friendsPlansList } from '../components/friendsPlans';
import { inviteCard } from '../components/inviteCard';
import { mapWidget } from '../components/mapWidget';
import { groupInvites, groupPins } from '../components/pinGroups';
import { firstName, fmtAgo, go, h } from '../dom';
import { distanceKm, withinDistance } from '../geo';
import { recommend } from '../match';
import { activityFor, currentUser, mapInvites } from '../state';
import { openInvite } from './inviteDetail';
import { openSportInfo } from './sportInfo';

export function render(): HTMLElement {
  const me = currentUser()!;
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const all = recommend(me, 20);
  const recs = all.slice(0, 3);
  const nearby = mapInvites(me.id).filter((i) => withinDistance(me, i.location, me.settings.maxDistance, me.settings.units));
  const closest = [...nearby].sort((a, b) => distanceKm(me, a.location) - distanceKm(me, b.location)).slice(0, 3);
  const activity = activityFor(me.id).slice(0, 5);

  // Close-up around you and the nearest invites. The whole map is one big link to the Map tab.
  const mini = mapWidget({
    key: 'mini', interactive: false, user: me, fitTo: [me, ...closest.map((i) => i.location)], maxZoom: 15,
    pins: groupPins(groupInvites(nearby), me),
  });

  return h('div', {},
    h('div', { class: 'greeting' }, h('h1', {}, `Good ${part}, ${firstName(me.name)}`)),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' },
        h('section', { 'aria-labelledby': 'rec-h' },
          h('div', { class: 'section-head' }, h('h2', { id: 'rec-h' }, 'Suggested for you'), all.length > recs.length ? h('a', { href: '#/map' }, 'See more on the map') : null),
          recs.length
            ? h('div', { class: 'card-list' }, recs.map((r) => inviteCard(r.invite, me, {
                onOpen: () => openInvite(r.invite.id), onShowMap: () => go(`#/map/${r.invite.id}`), onAbout: () => openSportInfo(r.invite.sportId) })))
            : h('div', { class: 'empty' }, h('h3', {}, 'No matching games yet'),
                h('p', {}, 'Nobody has posted a game for your sports. Start one and others will find it.'),
                h('a', { class: 'btn btn--primary', href: '#/create' }, 'Create an invite'))),
        h('section', { 'aria-labelledby': 'fp-h' },
          h('div', { class: 'section-head' }, h('h2', { id: 'fp-h' }, "Friends' plans"), h('a', { href: '#/social/plans' }, 'See all')),
          friendsPlansList(me, 3, openInvite, openSportInfo))),
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
