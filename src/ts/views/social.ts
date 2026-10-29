// Social tab: friends, my meetups (with bell badges), updates from accepted invites, people you have met.
import { avatar, fmtAgo, fmtWhen, h, toast } from '../dom';
import { activityFor as _a, addFriend, canAddFriend, currentUser, getSport, getUser, myPast, myUpcoming, notificationsFor, unreadCount } from '../state';
import { openInvite } from './inviteDetail';

void _a;
const bell = () =>
{
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'; return s;
};

export function render(): HTMLElement
{
  const me = currentUser()!;
  const upcoming = myUpcoming(me.id);
  const updates = notificationsFor(me.id).slice(0, 8);
  const friends = me.friendIds.map((id) => getUser(id)!);
  const met = new Set<string>();
  [...upcoming, ...myPast(me.id)].forEach((i) => i.memberIds.forEach((id) => { if (canAddFriend(id)) met.add(id); }));

  return h('div', {},
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Social'), h('p', {}, 'Your meetups, updates and friends.'))),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' },
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'My meetups')),
          upcoming.length ? h('div', { class: 'meetup-list' }, upcoming.map((i) =>
          {
            const n = unreadCount(me.id, i.id);
            return h('article', { class: 'card meetup-row' },
              h('div', { class: 'grow' }, h('h3', { class: 'card__title' }, getSport(i.sportId)!.name), h('p', { class: 'card__meta' }, fmtWhen(i.start, i.end)),
                h('p', { class: 'card__meta' }, `${i.location.label}, ${i.memberIds.length} of ${i.capacity} going`)),
              h('div', { class: 'avatar-stack' }, i.memberIds.slice(0, 4).map((id) => avatar(getUser(id)!, 'sm'))),
              h('button', { class: 'bell', type: 'button', 'aria-label': n ? `${n} new update${n === 1 ? '' : 's'}, open details` : 'Open details', onClick: () => openInvite(i.id) }, bell(), n ? h('span', { class: 'badge' }, String(n)) : null),
              h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => openInvite(i.id) }, 'View details'));
          })) : h('div', { class: 'empty' }, h('h3', {}, 'No meetups yet'), h('p', {}, 'Join a game from the map or create your own.'), h('a', { class: 'btn btn--primary', href: '#/map' }, 'Find a game'))),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Updates')),
          updates.length ? h('ul', { class: 'response-list' }, updates.map((u) => h('li', { class: `response ${u.read ? '' : 'response--unread'}`.trim() },
            h('span', { class: 'grow' }, u.text), h('span', { class: 'muted' }, fmtAgo(u.createdAt)),
            u.inviteId ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => openInvite(u.inviteId!) }, 'View') : null)))
            : h('div', { class: 'empty' }, 'When people join your meetups, you will see it here.'))),
      h('div', { class: 'stack' },
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Friends')),
          friends.length ? h('div', { class: 'friend-strip' }, friends.map((f) => h('div', { class: 'friend' }, avatar(f, 'lg'), f.name)))
            : h('div', { class: 'empty' }, 'No friends yet. Add people you meet in a game.')),
        h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'People you have played with')),
          met.size ? h('ul', { class: 'response-list' }, [...met].map((id) =>
          {
            const u = getUser(id)!;
            return h('li', { class: 'response' }, avatar(u, 'sm'), h('span', { class: 'grow' }, u.name),
              h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => { const r = addFriend(id); toast(r.ok ? `${u.name} is now your friend.` : r.error); } }, 'Add friend'));
          }))
            : h('p', { class: 'muted' }, 'Everyone you have met is already a friend, or you have not joined a meetup yet.')))));
}
