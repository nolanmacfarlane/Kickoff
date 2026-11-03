// "Friends' plans": upcoming invites your friends are going to. Used on Home (a few), the Social overview (a few) and the Friends' plans tab (filtered).
import { avatar, fmtWhen, h, iconButton } from '../dom';
import { friendsPlans } from '../state';
import type { Invite, User } from '../types';
import { sportLabel } from './sportBits';

const who = (friends: User[]): string =>
  friends.length === 1 ? `${friends[0].name} is going`
  : friends.length === 2 ? `${friends[0].name} and ${friends[1].name} are going`
  : `${friends[0].name}, ${friends[1].name} and ${friends.length - 2} more are going`;

/** `all` lets the caller pass an already filtered list (the Friends' plans tab); it defaults to every plan. */
export function friendsPlansList(me: User, limit: number | null, onOpen: (inviteId: string) => void, onAbout: (sportId: string) => void,
  all: { invite: Invite; friends: User[] }[] = friendsPlans(me.id)): HTMLElement {
  const plans = all.slice(0, limit ?? undefined);
  if (!plans.length) return h('div', { class: 'empty empty--tight' }, me.friendIds.length ? 'None of your friends have joined an upcoming game yet.' : 'Add friends to see what they are going to.');
  return h('ul', { class: 'friend-plans' }, plans.map(({ invite, friends }) =>
    h('li', { class: 'card card--tight friend-plan' },
      h('div', { class: 'avatar-stack' }, friends.slice(0, 3).map((f) => avatar(f, 'sm'))),
      h('div', { class: 'grow' },
        h('p', { class: 'friend-plan__who' }, who(friends)),
        h('div', { class: 'friend-plan__what' }, sportLabel(invite.sportId, { onAbout: () => onAbout(invite.sportId) }), h('span', { class: 'card__meta' }, fmtWhen(invite.start, invite.end))),
        h('p', { class: 'card__meta' }, invite.location.label)),
      iconButton('info', 'View details', () => onOpen(invite.id), 'icon-btn--filled'))));
}
