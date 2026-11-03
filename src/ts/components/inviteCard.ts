// Tags and cards for an invite. Tags that match the signed-in user's profile are highlighted yellow.
import { avatar, fmtWhen, h, iconButton, tag } from '../dom';
import { distanceKm, fmtDistance } from '../geo';
import { matchInvite, type MatchResult } from '../match';
import { getSport, getUser, isFull, isPast } from '../state';
import type { Invite, User } from '../types';
import { joinInvite } from './joinFlow';
import { sportLabel, uiIcon } from './sportBits';

/** All four levels collapse into one "All levels" tag. */
export const skillLabels = (inv: Invite): string[] => (inv.skills.length === 4 ? ['All levels'] : inv.skills);

export function inviteTags(inv: Invite, user: User, m: MatchResult = matchInvite(inv, user), opts: { hideSport?: boolean } = {}): HTMLElement {
  const sport = getSport(inv.sportId)!;
  return h('div', { class: 'tags' },
    inv.memberIds.includes(user.id) && !isPast(inv) ? tag('You’re going', 'tag--going') : null,
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

export interface CardOptions {
  onOpen: () => void;
  onShowMap?: () => void;
  onAbout: () => void;        // the (?) next to the sport name
  selected?: boolean;
}

export function inviteCard(inv: Invite, user: User, o: CardOptions): HTMLElement {
  const host = getUser(inv.hostId)!;
  const m = matchInvite(inv, user);
  const canJoin = !inv.memberIds.includes(user.id) && !isFull(inv) && !isPast(inv);
  return h('article', { class: `card rec-card ${o.selected ? 'card--selected' : ''}`.trim(), dataset: { invite: inv.id } },
    h('div', { class: 'rec-card__top' },
      h('div', { class: 'grow' },
        sportLabel(inv.sportId, { as: 'h3', className: 'card__title', onAbout: o.onAbout }),
        h('p', { class: 'rec-card__when' }, fmtWhen(inv.start, inv.end)),
        h('p', { class: 'card__meta' }, `${inv.location.label}, ${distanceFrom(user, inv)} away`)),
      h('div', { class: 'rec-card__host', title: `Host: ${host.name}` }, avatar(host), h('span', { class: 'rec-card__host-name' }, host.name))),
    inviteTags(inv, user, m, { hideSport: true }),
    h('div', { class: 'rec-card__foot' },
      h('span', { class: 'rec-card__spots' }, `${inv.memberIds.length}/${inv.capacity} going`),
      h('div', { class: 'row' },
        canJoin ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', 'aria-label': `Join ${getSport(inv.sportId)!.name}`, onClick: () => joinInvite(inv.id) }, 'Join') : null,
        o.onShowMap ? h('button', { class: 'icon-btn icon-btn--filled', type: 'button', 'aria-label': 'Show on map', title: 'Show on map', dataset: { key: `showmap-${inv.id}` }, onClick: o.onShowMap }, uiIcon('mapPin')) : null,
        iconButton('info', 'View details', o.onOpen, 'icon-btn--filled'))));
}
