// Tags and cards for an invite. Tags that match the signed-in user's profile are highlighted yellow.
import { avatar, firstName, fmtWhen, go, h, tag } from '../dom';
import { distanceKm, fmtDistance } from '../geo';
import { matchInvite, type MatchResult } from '../match';
import { canSee, getSport, getUser, isFull, isPast, meetupChatId, meetupChatUnread, unreadCount } from '../state';
import type { Invite, User } from '../types';
import { joinInvite } from './joinFlow';
import { shareInvite } from './share';
import { sportLabel, uiIcon } from './sportBits';

/** All four levels collapse into one "All levels" tag. */
export const skillLabels = (inv: Invite): string[] => (inv.skills.length === 4 ? ['All levels'] : inv.skills);

export function inviteTags(inv: Invite, user: User, m: MatchResult = matchInvite(inv, user), opts: { hideSport?: boolean; hideGoing?: boolean } = {}): HTMLElement {
  const sport = getSport(inv.sportId)!;
  return h('div', { class: 'tags' },
    !opts.hideGoing && inv.memberIds.includes(user.id) && !isPast(inv) ? tag('You’re going', 'tag--going') : null,
    opts.hideSport ? null : tag(sport.name, m.keys.has('sport') ? 'tag--match' : ''),
    skillLabels(inv).map((l) => tag(l, (l === 'All levels' ? m.keys.has('skill') : m.skill === l) ? 'tag--match' : '')),
    tag(inv.vibe, m.keys.has('vibe') ? 'tag--match' : ''),
    m.keys.has('schedule') ? tag('Fits your schedule', 'tag--match') : null,
    inv.gear.available ? tag('Gear shared', 'tag--gear') : null,
    inv.visibility === 'friends' ? tag('Friends only', 'tag--friends') : null,
    inv.recurring ? tag('Weekly') : null,
    isFull(inv) ? tag('Full', 'tag--full') : null,
  );
}

export const distanceFrom = (user: User, inv: Invite): string => fmtDistance(distanceKm(user, inv.location), user.settings.units);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What's new on an invite since you last looked, as pills beside the title. Always visible (the action buttons only show on hover). */
function newPills(inv: Invite, user: User): HTMLElement[] {
  const msgs = meetupChatUnread(user.id, inv.id) ?? 0, updates = unreadCount(user.id, inv.id);
  return [
    msgs ? tag(plural(msgs, 'new message'), 'tag--new') : null,
    updates ? tag(plural(updates, 'update'), 'tag--new') : null,
  ].filter((x): x is HTMLElement => x !== null);
}

/** Sport name (opens the card) with its ? button, then any "new" pills. */
function cardTitle(inv: Invite, user: User, onOpen: () => void, onAbout: () => void): HTMLElement {
  return h('div', { class: 'card__title-row' },
    sportLabel(inv.sportId, { as: 'h3', className: 'card__title', onOpen, onAbout }),
    newPills(inv, user));
}

export interface ActionOptions {
  /** Defaults to opening the invite on the Map tab. Pass false where the card is already pinned on the map. */
  onShowMap?: (() => void) | false;
}

/** An icon button, with a count badge when there is something new. */
function actionButton(iconEl: Element, label: string, onClick: () => void, count = 0, key?: string): HTMLElement {
  const btn = h('button', { class: 'icon-btn icon-btn--filled', type: 'button', 'aria-label': count ? `${label}, ${count} new` : label, title: label,
    dataset: key ? { key } : {}, onClick }, iconEl);
  return h('span', { class: 'icon-badge' }, btn, count ? h('span', { class: 'badge', 'aria-hidden': 'true' }, String(count)) : null);
}

/** Every action on an invite, in one fixed order: Join, Share, Group chat, Show on map. Each shows only when it applies.
 *  Details has no button: the whole card opens it (see cardTitle). */
function inviteActions(inv: Invite, user: User, o: ActionOptions = {}): HTMLElement {
  const sport = getSport(inv.sportId)!.name;
  const past = isPast(inv);
  const canJoin = !inv.memberIds.includes(user.id) && !isFull(inv) && !past;
  const chatN = meetupChatUnread(user.id, inv.id);
  const onMap = !past && !isFull(inv) && canSee(inv, user.id);   // the Map tab only shows these
  const showMap = o.onShowMap === false ? null : o.onShowMap ?? (() => go(`#/map/${inv.id}`));
  return h('div', { class: 'card-actions' },
    canJoin ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', 'aria-label': `Join ${sport}`, onClick: () => joinInvite(inv.id) }, 'Join') : null,
    past ? null : actionButton(uiIcon('share'), `Share ${sport}`, () => shareInvite(inv.id)),
    chatN === null ? null : actionButton(uiIcon('chat'), 'Group chat', () => go(`#/social/messages/${meetupChatId(inv.id)}`), chatN),
    onMap && showMap ? actionButton(uiIcon('mapPin'), 'Show on map', showMap, 0, `showmap-${inv.id}`) : null);
}

/** Who to show top right. Same spot and style everywhere; which people depends on the list. */
export type CardPeople = { kind: 'host' } | { kind: 'members' } | { kind: 'friends'; friends: User[] };

export interface CardOptions extends ActionOptions {
  onOpen: () => void;         // the whole card opens the invite's details
  onAbout: () => void;        // the (?) next to the sport name
  selected?: boolean;
  people?: CardPeople;        // default: the host
  hideGoingTag?: boolean;     // on lists where every invite is one you're going to
  as?: 'article' | 'li';
}

/** "Sam", "Sam, Alex" or "Sam +2". */
const names = (users: User[]): string =>
  users.length === 1 ? firstName(users[0].name)
  : users.length === 2 ? `${firstName(users[0].name)}, ${firstName(users[1].name)}`
  : `${firstName(users[0].name)} +${users.length - 1}`;

function peopleEl(inv: Invite, p: CardPeople): HTMLElement {
  const stack = (users: User[], max: number) => h('div', { class: 'avatar-stack' }, users.slice(0, max).map((u) => avatar(u, 'sm')));
  if (p.kind === 'members') {
    const members = inv.memberIds.map((id) => getUser(id)!);
    return h('div', { class: 'invite-card__people', title: members.map((u) => u.name).join(', ') }, stack(members, 4));
  }
  const users = p.kind === 'friends' ? p.friends : [getUser(inv.hostId)!];
  return h('div', { class: 'invite-card__people', title: p.kind === 'host' ? `Host: ${users[0].name}` : users.map((u) => u.name).join(', ') },
    h('span', { class: 'invite-card__names' }, names(users)), stack(users, 3));
}

/** The one invite card used everywhere (suggestions, map, profile, meetups, friends' plans). */
export function inviteCard(inv: Invite, user: User, o: CardOptions): HTMLElement {
  return h(o.as ?? 'article', { class: `card card--link invite-card ${o.selected ? 'card--selected' : ''}`.trim(), dataset: { invite: inv.id } },
    h('div', { class: 'invite-card__top' },
      h('div', { class: 'grow' },
        cardTitle(inv, user, o.onOpen, o.onAbout),
        h('p', { class: 'invite-card__when' }, fmtWhen(inv.start, inv.end)),
        h('p', { class: 'card__meta' }, `${inv.location.label}, ${distanceFrom(user, inv)} away`)),
      peopleEl(inv, o.people ?? { kind: 'host' })),
    inviteTags(inv, user, matchInvite(inv, user), { hideSport: true, hideGoing: o.hideGoingTag }),
    h('div', { class: 'invite-card__foot' },
      h('span', { class: 'invite-card__spots' }, `${inv.memberIds.length}/${inv.capacity} going`),
      inviteActions(inv, user, { onShowMap: o.onShowMap })));
}
