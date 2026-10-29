// Tags and cards for an invite. Tags that match the signed-in user's profile are highlighted yellow.
import { avatar, fmtWhen, h, tag } from '../dom';
import { matchInvite, type MatchKey, type MatchResult } from '../match';
import { getSport, getUser, isFull, spotsLeft } from '../state';
import type { Invite, User } from '../types';

export function inviteTags(inv: Invite, user: User, m: MatchResult = matchInvite(inv, user)): HTMLElement
{
  const sport = getSport(inv.sportId)!;
  const hl = (k: MatchKey, extra = '') => `${m.keys.has(k) ? 'tag--match' : ''} ${extra}`.trim();
  return h('div', { class: 'tags' },
    tag(sport.name, hl('sport')),
    tag(inv.skill, hl('skill')),
    tag(inv.vibe, hl('vibe')),
    m.keys.has('schedule') ? tag('Fits your schedule', 'tag--match') : null,
    inv.gear.available ? tag('Gear shared', hl('gear', 'tag--gear')) : null,
    inv.visibility === 'friends' ? tag('Friends only', 'tag--friends') : null,
    inv.recurring ? tag('Weekly') : null,
    isFull(inv) ? tag('Full', 'tag--full') : null,
  );
}

export interface CardOptions { onOpen: () => void; onShowMap?: () => void; showWhy?: boolean; selected?: boolean }

export function inviteCard(inv: Invite, user: User, o: CardOptions): HTMLElement
{
  const sport = getSport(inv.sportId)!;
  const host = getUser(inv.hostId)!;
  const m = matchInvite(inv, user);
  const members = inv.memberIds.map((id) => getUser(id)!);
  return h('article', { class: `card rec-card ${o.selected ? 'card--selected' : ''}`.trim(), dataset: { invite: inv.id } },
    h('div', { class: 'rec-card__top' },
      h('div', {},
        h('h3', { class: 'card__title' }, sport.name),
        h('p', { class: 'rec-card__when' }, fmtWhen(inv.start, inv.end)),
        h('p', { class: 'card__meta' }, `${inv.location.label}, hosted by ${host.name}`)),
      h('div', { class: 'avatar-stack' }, members.slice(0, 4).map((u) => avatar(u, 'sm')))),
    inviteTags(inv, user, m),
    o.showWhy && m.why ? h('p', { class: 'card__why' }, m.why) : null,
    h('div', { class: 'rec-card__foot' },
      h('span', { class: 'rec-card__spots' }, isFull(inv) ? 'Full' : `${inv.memberIds.length} of ${inv.capacity} going, ${spotsLeft(inv)} spot${spotsLeft(inv) === 1 ? '' : 's'} left`),
      h('div', { class: 'row' },
        o.onShowMap ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: o.onShowMap }, 'Show on map') : null,
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: o.onOpen }, 'View details'))));
}
