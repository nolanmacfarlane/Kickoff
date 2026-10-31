// Invite detail: opens in a modal from anywhere. All rules are enforced in state.ts; this only shows them.
import { distanceFrom, inviteTags } from '../components/inviteCard';
import { seg, segMulti } from '../components/seg';
import { SKILLS } from '../data';
import { avatar, closeModal, fmtWhen, h, iconButton, openModal, tag, toast } from '../dom';
import { matchInvite } from '../match';
import {
  acceptFriendRequest, acceptInvite, canSee, currentUser, editInviteTags, friendStatus, getInvite, getSport, getUser, getVenue,
  isFull, isPast, leaveInvite, markInviteRead, requestFrom, sendFriendRequest, spotsLeft, tagsLocked, unreadCount,
} from '../state';
import type { Skill, Vibe, Visibility } from '../types';
import { openSportInfo } from './sportInfo';

export function openInvite(id: string): void {
  const me = currentUser();
  if (me && unreadCount(me.id, id) > 0) markInviteRead(id);
  openModal(() => view(id), 'Invite details');
}

function view(id: string): HTMLElement | null {
  const inv = getInvite(id);
  const me = currentUser();
  if (!inv || !me) return null;
  const sport = getSport(inv.sportId)!;
  const isMember = inv.memberIds.includes(me.id);
  const isHost = inv.hostId === me.id;
  const past = isPast(inv);
  const editable = isHost && !tagsLocked(inv) && !past;
  const venue = inv.location.venueId ? getVenue(inv.location.venueId) : undefined;
  const m = matchInvite(inv, me);
  const run = (r: { ok: boolean } & { error?: string }, success?: string) => { if (!r.ok) toast(r.error ?? 'Something went wrong.'); else if (success) toast(success); };
  const field = (label: string, control: Node) => h('div', { class: 'field' }, h('span', { class: 'field__label' }, label), control);

  // Host alone: labelled controls, like Create invite. Otherwise just the tags.
  const tagsBlock = editable
    ? h('div', { class: 'stack-sm' },
        h('p', { class: 'locked-note' }, 'You can change these until someone joins.'),
        field('Skill levels welcome', segMulti<Skill>('edit-skill', SKILLS.map((v) => ({ value: v, label: v })), inv.skills, (v) => run(editInviteTags(inv.id, { skills: v })))),
        field('Vibe', seg<Vibe>('edit-vibe', [{ value: 'Casual', label: 'Casual' }, { value: 'Competitive', label: 'Competitive' }], inv.vibe, (v) => run(editInviteTags(inv.id, { vibe: v })))),
        field('Who can see it', seg<Visibility>('edit-vis', [{ value: 'open', label: 'Open to everyone' }, { value: 'friends', label: 'Friends only' }], inv.visibility, (v) => run(editInviteTags(inv.id, { visibility: v })))))
    : h('div', { class: 'stack-sm' }, inviteTags(inv, me, m), isHost && tagsLocked(inv) && !past ? h('p', { class: 'locked-note' }, 'Tags are locked because someone has joined.') : null);

  const place = venue
    ? h('div', { class: 'venue-card' }, h('h4', {}, venue.name),
        h('dl', {}, h('dt', {}, 'Distance'), h('dd', {}, `${distanceFrom(me, inv)} from you`), h('dt', {}, 'Area'), h('dd', {}, venue.area),
          h('dt', {}, 'Hours'), h('dd', {}, venue.hours), h('dt', {}, 'Rentals'), h('dd', {}, venue.rentals.length ? venue.rentals.join(', ') : 'None on site')),
        h('p', { class: 'card__meta' }, venue.info))
    : h('div', { class: 'venue-card' }, h('h4', {}, inv.location.label), h('p', { class: 'card__meta' }, `${distanceFrom(me, inv)} from you. A custom pin, so no venue details are available.`));

  function friendControl(uid: string): Node | null {
    const status = friendStatus(uid);
    const name = getUser(uid)!.name;
    if (status === 'self') return null;
    if (status === 'friend') return tag('Friend', 'tag--friends');
    if (status === 'requested') return h('button', { class: 'btn btn--secondary btn--sm', type: 'button', disabled: true }, 'Requested');
    if (status === 'incoming') return h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => run(acceptFriendRequest(requestFrom(uid)!.id), `You and ${name} are now friends.`) }, 'Accept request');
    return h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => run(sendFriendRequest(uid), 'Friend request sent.') }, 'Add friend');
  }

  const people = inv.memberIds.map((uid) => {
    const u = getUser(uid)!;
    const level = u.currentSports.find((s) => s.sportId === inv.sportId)?.skill;
    const sub = [uid === inv.hostId ? 'Host' : null, level ?? null].filter(Boolean).join(', ');
    return h('li', { class: 'attendee' }, avatar(u),
      h('div', { class: 'grow' }, h('div', { class: 'attendee__name' }, uid === me.id ? `${u.name} (you)` : u.name), sub ? h('div', { class: 'attendee__role' }, sub) : null),
      friendControl(uid));
  });

  let actions: HTMLElement;
  if (past) actions = h('p', { class: 'notice' }, 'This meetup has already happened.');
  else if (isMember) {
    const cancel = isHost && inv.memberIds.length === 1;
    actions = h('div', { class: 'detail__actions' }, h('button', { class: 'btn btn--danger', type: 'button',
      onClick: () => { run(leaveInvite(inv.id), cancel ? 'Invite cancelled.' : 'You left the meetup.'); closeModal(); } }, cancel ? 'Cancel invite' : 'Leave'));
  } else {
    const blocked = isFull(inv) || !canSee(inv, me.id);
    actions = h('div', { class: 'detail__actions' }, h('button', { class: 'btn btn--primary', type: 'button', disabled: blocked, dataset: { key: 'join' },
      onClick: () => run(acceptInvite(inv.id), 'You are in. The host and other members have been told.') }, isFull(inv) ? 'Full' : 'Join'));
  }

  return h('div', { class: 'detail' },
    h('div', { class: 'detail__head' }, h('div', { class: 'grow' },
      h('div', { class: 'row' }, h('h2', {}, sport.name), iconButton('help', `About ${sport.name}: gear and where to borrow`, () => openSportInfo(sport.id), 'icon-btn--sm')),
      h('p', { class: 'detail__when' }, fmtWhen(inv.start, inv.end)), h('p', { class: 'card__meta' }, inv.recurring ? 'Repeats weekly' : 'One time'))),
    tagsBlock,
    !isMember && m.why ? h('p', { class: 'card__why' }, `Why this fits you: ${m.why}`) : null,
    inv.gear.available ? h('div', { class: 'gear-box' }, `Gear to share: ${inv.gear.description}`) : null,
    h('section', {}, h('h3', {}, 'Where'), place),
    inv.notes ? h('section', {}, h('h3', {}, 'Notes from the host'), h('p', {}, inv.notes)) : null,
    h('section', {}, h('h3', {}, `Who is going (${inv.memberIds.length}/${inv.capacity})`),
      h('p', { class: 'card__meta' }, isFull(inv) ? 'Full' : `${spotsLeft(inv)} spot${spotsLeft(inv) === 1 ? '' : 's'} left`), h('ul', { class: 'attendee-list' }, people)),
    actions);
}
