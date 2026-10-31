// Social tab: my meetups (one details button with a notification count), friend requests, updates, friends grid.
import { avatar, fmtAgo, fmtWhen, h, icon, toast } from '../dom';
import {
  acceptFriendRequest, currentUser, declineFriendRequest, getSport, getUser, incomingRequests, myUpcoming, notificationsFor, outgoingRequests, unreadCount,
} from '../state';
import { openInvite } from './inviteDetail';

export function render(): HTMLElement {
  const me = currentUser()!;
  const upcoming = myUpcoming(me.id);
  const updates = notificationsFor(me.id).slice(0, 8);
  const friends = me.friendIds.map((id) => getUser(id)!);
  const incoming = incomingRequests(me.id);
  const outgoing = outgoingRequests(me.id);

  const meetupRow = (i: (typeof upcoming)[number]) => {
    const n = unreadCount(me.id, i.id);
    return h('article', { class: 'card meetup-row' },
      h('div', { class: 'grow' }, h('h3', { class: 'card__title' }, getSport(i.sportId)!.name), h('p', { class: 'card__meta' }, fmtWhen(i.start, i.end)),
        h('p', { class: 'card__meta' }, `${i.location.label}, ${i.memberIds.length}/${i.capacity} going`)),
      h('div', { class: 'avatar-stack' }, i.memberIds.slice(0, 4).map((id) => avatar(getUser(id)!, 'sm'))),
      h('span', { class: 'icon-badge' },
        h('button', { class: 'icon-btn icon-btn--filled', type: 'button', 'aria-label': n ? `View details, ${n} new update${n === 1 ? '' : 's'}` : 'View details', title: 'View details', onClick: () => openInvite(i.id) }, icon('info')),
        n ? h('span', { class: 'badge', 'aria-hidden': 'true' }, String(n)) : null));
  };

  return h('div', {},
    h('div', { class: 'cols' },
      h('div', { class: 'stack' },
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'My meetups')),
          upcoming.length ? h('div', { class: 'meetup-list' }, upcoming.map(meetupRow))
            : h('div', { class: 'empty' }, h('h3', {}, 'No meetups yet'), h('p', {}, 'Join a game from the map or create your own.'), h('a', { class: 'btn btn--primary', href: '#/map' }, 'Find a game'))),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Updates')),
          updates.length ? h('ul', { class: 'response-list' }, updates.map((u) => h('li', { class: `response ${u.read ? '' : 'response--unread'}`.trim() },
            h('span', { class: 'grow' }, u.text), h('span', { class: 'muted' }, fmtAgo(u.createdAt)),
            u.inviteId ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => openInvite(u.inviteId!) }, 'View') : null)))
            : h('div', { class: 'empty' }, 'When people join your meetups, you will see it here.'))),
      h('div', { class: 'stack' },
        h('section', { 'aria-labelledby': 'req-h' }, h('div', { class: 'section-head' }, h('h2', { id: 'req-h' }, 'Requests')),
          incoming.length || outgoing.length ? h('ul', { class: 'response-list' },
            incoming.map((r) => { const u = getUser(r.fromId)!;
              return h('li', { class: 'response response--unread' }, avatar(u, 'sm'), h('span', { class: 'grow' }, `${u.name} wants to be friends`),
                h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => { const x = acceptFriendRequest(r.id); toast(x.ok ? `You and ${u.name} are now friends.` : x.error); } }, 'Accept'),
                h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => declineFriendRequest(r.id) }, 'Decline')); }),
            outgoing.map((r) => { const u = getUser(r.toId)!;
              return h('li', { class: 'response' }, avatar(u, 'sm'), h('span', { class: 'grow' }, `Waiting for ${u.name}`),
                h('button', { class: 'btn btn--text btn--sm', type: 'button', onClick: () => declineFriendRequest(r.id) }, 'Cancel')); }))
            : h('p', { class: 'muted' }, 'No pending requests. Find people on an invite and tap Add friend.')),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Friends')),
          friends.length ? h('div', { class: 'friend-grid' }, friends.map((f) => h('div', { class: 'friend' }, avatar(f, 'lg'), f.name)))
            : h('div', { class: 'empty' }, 'No friends yet. Add people you see on an invite.')))));
}
