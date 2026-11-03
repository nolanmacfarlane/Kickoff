// "Friends' plans": upcoming invites your friends are going to. Used on Home (a few), the Social overview (a few) and the Friends' plans tab (filtered).
import { h } from '../dom';
import { friendsPlans } from '../state';
import type { Invite, User } from '../types';
import { inviteCard } from './inviteCard';

/** `all` lets the caller pass an already filtered list (the Friends' plans tab); it defaults to every plan. */
export function friendsPlansList(me: User, limit: number | null, onOpen: (inviteId: string) => void, onAbout: (sportId: string) => void,
  all: { invite: Invite; friends: User[] }[] = friendsPlans(me.id)): HTMLElement {
  const plans = all.slice(0, limit ?? undefined);
  if (!plans.length) return h('div', { class: 'empty empty--tight' }, me.friendIds.length ? 'None of your friends have joined an upcoming game yet.' : 'Add friends to see what they are going to.');
  return h('ul', { class: 'card-list' }, plans.map(({ invite, friends }) => inviteCard(invite, me, {
    as: 'li', people: { kind: 'friends', friends }, onOpen: () => onOpen(invite.id), onAbout: () => onAbout(invite.sportId) })));
}
