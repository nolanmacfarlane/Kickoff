// Tags and cards for an invite. Tags that match the signed-in user's profile are highlighted yellow.
import { avatar, fmtWhen, h, icon, iconButton, tag } from '../dom';
import { distanceKm, fmtDistance } from '../geo';
import { matchInvite, type MatchResult } from '../match';
import { getSport, getUser, isFull } from '../state';
import type { Invite, User } from '../types';

/** All four levels collapse into one "All levels" tag. */
export const skillLabels = (inv: Invite): string[] => (inv.skills.length === 4 ? ['All levels'] : inv.skills);

export function inviteTags(inv: Invite, user: User, m: MatchResult = matchInvite(inv, user), opts: { hideSport?: boolean } = {}): HTMLElement {
  const sport = getSport(inv.sportId)!;
  return h('div', { class: 'tags' },
    opts.hideSport ? null : tag(sport.name, m.keys.has('sport') ? 'tag--match' : ''),
    skillLabels(inv).map((l) => tag(l, (l === 'All levels' ? m.keys.has('skill') : m.skill === l) ? 'tag--match' : '')),
    tag(inv.vibe, m.keys.has('vibe') ? 'tag--match' : ''),
    m.keys.has('schedule') ? tag('Fits your schedule', 'tag--match') : null,
    inv.gear.available ? tag('Gear shared', `tag--gear ${m.keys.has('gear') ? 'tag--match' : ''}`) : null,
    inv.visibility === 'friends' ? tag('Friends only', 'tag--friends') : null,
    inv.recurring ? tag('Weekly') : null,
    isFull(inv) ? tag('Full', 'tag--full') : null,
  );
}

export const distanceFrom = (user: User, inv: Invite): string => fmtDistance(distanceKm(user, inv.location), user.settings.units);

export interface CardOptions {
  onOpen: () => void;
  onShowMap?: () => void;
  onAbout?: () => void;       // small "about this sport" button next to the title
  showWhy?: boolean;
  selected?: boolean;
}

export function inviteCard(inv: Invite, user: User, o: CardOptions): HTMLElement {
  const sport = getSport(inv.sportId)!;
  const host = getUser(inv.hostId)!;
  const m = matchInvite(inv, user);
  return h('article', { class: `card rec-card ${o.selected ? 'card--selected' : ''}`.trim(), dataset: { invite: inv.id } },
    h('div', { class: 'rec-card__top' },
      h('div', { class: 'grow' },
        h('div', { class: 'row' }, h('h3', { class: 'card__title' }, sport.name), o.onAbout ? iconButton('help', `About ${sport.name}`, o.onAbout, 'icon-btn--sm') : null),
        h('p', { class: 'rec-card__when' }, fmtWhen(inv.start, inv.end)),
        h('p', { class: 'card__meta' }, `${inv.location.label}, ${distanceFrom(user, inv)} away`),
        h('p', { class: 'card__meta' }, `Hosted by ${host.name}`)),
      avatar(host, 'lg')),
    inviteTags(inv, user, m, { hideSport: true }),
    o.showWhy && m.why ? h('p', { class: 'card__why' }, m.why) : null,
    h('div', { class: 'rec-card__foot' },
      h('span', { class: 'rec-card__spots' }, `${inv.memberIds.length}/${inv.capacity} going`),
      h('div', { class: 'row' },
        o.onShowMap ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: o.onShowMap }, 'Show on map') : null,
        iconButton('info', 'View details', o.onOpen, 'icon-btn--filled'))));
}
void icon;
