// Social tab, Overview: my meetups (group chat + details), friend requests, friends' plans, friends. Messages is its own view.
import { friendsPlansList } from '../components/friendsPlans';
import { socialNav } from '../components/socialNav';
import { sportLabel, uiIcon } from '../components/sportBits';
import { avatar, fmtWhen, go, h, icon, toast } from '../dom';
import {
  acceptFriendRequest, chatSummaries, currentUser, declineFriendRequest, directChatId, getUser, incomingRequests, markKindRead, meetupChatId, myUpcoming,
  outgoingRequests, unreadCount,
} from '../state';
import { openInvite } from './inviteDetail';
import * as messages from './messages';
import { openSportInfo } from './sportInfo';

export function render(args: string[]): HTMLElement {
  if (args[0] === 'messages') return messages.render(args.slice(1));
  const me = currentUser()!;
  const upcoming = myUpcoming(me.id);
  const friends = me.friendIds.map((id) => getUser(id)!);
  const incoming = incomingRequests(me.id);
  const outgoing = outgoingRequests(me.id);
  setTimeout(() => markKindRead('friend'), 0);   // friend requests are shown on this screen, so they count as seen
  const chatUnread = new Map(chatSummaries(me.id).map((c) => [c.id, c.unread]));

  const meetupRow = (i: (typeof upcoming)[number]) => {
    const n = unreadCount(me.id, i.id);
    const chatN = chatUnread.get(meetupChatId(i.id)) ?? 0;
    return h('article', { class: 'card meetup-row' },
      h('div', { class: 'grow' }, sportLabel(i.sportId, { as: 'h3', className: 'card__title', onAbout: () => openSportInfo(i.sportId) }),
        h('p', { class: 'card__meta' }, fmtWhen(i.start, i.end)), h('p', { class: 'card__meta' }, `${i.location.label}, ${i.memberIds.length}/${i.capacity} going`)),
      h('div', { class: 'avatar-stack' }, i.memberIds.slice(0, 4).map((id) => avatar(getUser(id)!, 'sm'))),
      h('span', { class: 'icon-badge' },
        h('button', { class: 'icon-btn icon-btn--filled', type: 'button', 'aria-label': chatN ? `Group chat, ${chatN} unread` : 'Group chat', title: 'Group chat', onClick: () => go(`#/social/messages/${meetupChatId(i.id)}`) }, uiIcon('chat')),
        chatN ? h('span', { class: 'badge', 'aria-hidden': 'true' }, String(chatN)) : null),
      h('span', { class: 'icon-badge' },
        h('button', { class: 'icon-btn icon-btn--filled', type: 'button', 'aria-label': n ? `View details, ${n} new update${n === 1 ? '' : 's'}` : 'View details', title: 'View details', onClick: () => openInvite(i.id) }, icon('info')),
        n ? h('span', { class: 'badge', 'aria-hidden': 'true' }, String(n)) : null));
  };

  return h('div', {}, socialNav('overview'),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' },
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'My meetups')),
          upcoming.length ? h('div', { class: 'meetup-list' }, upcoming.map(meetupRow))
            : h('div', { class: 'empty' }, h('h3', {}, 'No meetups yet'), h('p', {}, 'Join a game from the map or create your own.'), h('a', { class: 'btn btn--primary', href: '#/map' }, 'Find a game'))),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, "Friends' plans")), friendsPlansList(me, null, openInvite, openSportInfo))),
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
            : h('div', { class: 'empty empty--tight' }, 'No pending requests. Find people on an invite and tap Add friend.')),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Friends')),
          friends.length ? h('div', { class: 'friend-grid' }, friends.map((f) => h('div', { class: 'friend' }, avatar(f, 'lg'), h('span', {}, f.name),
            h('button', { class: 'btn btn--secondary btn--sm', type: 'button', 'aria-label': `Message ${f.name}`, onClick: () => go(`#/social/messages/${directChatId(me.id, f.id)}`) }, 'Message'))))
            : h('div', { class: 'empty' }, 'No friends yet. Add people you see on an invite.')))));
}
