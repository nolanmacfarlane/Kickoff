// Social tab. Overview shows a short preview of each section; Invites, Friends' plans, Requests and Friends each have
// their own tab with search and filters. Messages is its own view.
import { friendsPlansList } from '../components/friendsPlans';
import { seg, toggleBox } from '../components/seg';
import { socialNav, type SocialTab } from '../components/socialNav';
import { inviteCard } from '../components/inviteCard';
import { uiIcon } from '../components/sportBits';
import { avatar, type Child, confirmDialog, fmtAgo, go, h, keepFocus, toast } from '../dom';
import { setRefresher } from '../nav';
import {
  acceptFriendRequest, chatSummaries, currentUser, declineFriendRequest, directChatId, friendsPlans, getSport, getUser, incomingRequests, lastPlayedWith,
  markKindRead, inviteChatId, myUpcoming, outgoingRequests, removeFriend, unreadCount,
} from '../state';
import type { FriendRequest, Invite, NotificationKind, User } from '../types';
import { openInvite } from './inviteDetail';
import * as messages from './messages';
import { openSportInfo } from './sportInfo';

const PREVIEW = { invites: 5, plans: 5, requests: 3, friends: 8 };
const DAY = 86_400_000;
type TimeRange = 'any' | 'today' | 'tomorrow' | 'week';

// Filters survive re-renders and moving between tabs, like the Map tab's.
const inviteF = { q: '', sport: 'all', time: 'any' as TimeRange, unread: false };
const planF = { q: '', sport: 'all', time: 'any' as TimeRange, friend: 'all' };
const requestF = { q: '', dir: 'all' as 'all' | 'incoming' | 'sent' };
const friendF = { q: '', sort: 'name' as 'name' | 'recent' };

export function render(args: string[]): HTMLElement {
  switch (args[0]) {
    case 'messages': return messages.render(args.slice(1));
    case 'invites': return invitesTab();
    case 'plans': return plansTab();
    case 'requests': return requestsTab();
    case 'friends': return friendsTab();
    default: return overview();
  }
}

// ---------- helpers ----------

/** Seeing a list counts as reading its notifications (there is no Updates list to read them in). */
const markSeen = (...kinds: NotificationKind[]) => setTimeout(() => markKindRead(...kinds), 0);

/** Every word typed must appear somewhere in the texts (case-insensitive). */
function matches(q: string, texts: string[]): boolean {
  const hay = texts.join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
const sportWords = (sportId: string): string[] => { const s = getSport(sportId)!; return [s.name, ...s.aliases]; };
const inviteWords = (i: Invite): string[] => [...sportWords(i.sportId), i.location.label, ...i.memberIds.map((id) => getUser(id)!.name)];

function inTime(start: number, range: TimeRange): boolean {
  if (range === 'any') return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.floor((start - today.getTime()) / DAY);
  if (range === 'today') return days === 0;
  if (range === 'tomorrow') return days === 1;
  return days >= 0 && days < 7;
}

function select(label: string, key: string, value: string, opts: [string, string][], onPick: (v: string) => void): HTMLElement {
  return h('select', { class: 'select', 'aria-label': label, value, dataset: { key }, onChange: (e: Event) => onPick((e.target as HTMLSelectElement).value) },
    opts.map(([v, text]) => h('option', { value: v }, text)));
}
const sportOptions = (sportIds: string[]): [string, string][] =>
  [['all', 'All sports'], ...[...new Set(sportIds)].map((id) => getSport(id)!).sort((a, b) => a.name.localeCompare(b.name)).map((s): [string, string] => [s.id, s.name])];
const TIME_OPTIONS: [string, string][] = [['any', 'Any time'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days']];

const sectionHead = (title: string, id: string, href: string, total: number) =>
  h('div', { class: 'section-head' }, h('h2', { id }, title), total ? h('a', { href }, `See all (${total})`) : null);

/** "Showing 3 of 9" above a filtered list, with a way to clear the filters. */
function countLine(shown: number, total: number, filtered: boolean, clear: () => void): HTMLElement | null {
  if (!filtered || !total) return null;
  return h('div', { class: 'list-count' }, h('span', { role: 'status' }, `Showing ${shown} of ${total}`),
    h('button', { class: 'btn btn--text btn--sm', type: 'button', onClick: clear }, 'Clear filters'));
}
const noMatch = (what: string, clear: () => void) =>
  h('div', { class: 'empty empty--tight' }, h('p', {}, `No ${what} match your search and filters.`),
    h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: clear }, 'Clear filters'));

/**
 * A tab with a search box, filter controls and a results list. The search box is built once, so typing is never
 * interrupted; the controls and results redraw on every keystroke, filter change and app state change.
 */
function listTab(o: {
  tab: SocialTab; searchLabel: string; placeholder: string; state: { q: string };
  controls: () => Child[]; results: () => Child[];
}): { el: HTMLElement; draw: () => void } {
  const navHolder = h('div', {});
  const input = h('input', {
    class: 'input', type: 'search', placeholder: o.placeholder, value: o.state.q, dataset: { key: `q-${o.tab}` }, autocomplete: 'off',
    onInput: () => { o.state.q = input.value; draw(); },
  });
  const controls = h('div', { class: 'list-tools__filters' });
  const results = h('div', { class: 'list-results' });
  function draw(): void {
    if (input.value !== o.state.q) input.value = o.state.q;   // "Clear filters" also clears the search
    keepFocus(() => {
      navHolder.replaceChildren(socialNav(o.tab));
      controls.replaceChildren(...flatten(o.controls()));
      results.replaceChildren(...flatten(o.results()));
    });
  }
  draw();
  setRefresher(draw);   // app state changes (a bot accepts, someone joins) redraw the list, not the search box
  const el = h('div', {}, navHolder,
    h('div', { class: 'list-tools' },
      h('label', { class: 'search-field' }, h('span', { class: 'sr-only' }, o.searchLabel), uiIcon('search'), input),
      controls),
    results);
  return { el, draw };
}
function flatten(c: Child[]): Node[] {
  const out: Node[] = [];
  for (const x of c) {
    if (x === null || x === undefined || x === false) continue;
    if (Array.isArray(x)) out.push(...flatten(x));
    else out.push(x instanceof Node ? x : document.createTextNode(String(x)));
  }
  return out;
}

// ---------- rows ----------

const myInviteCard = (me: User, i: Invite): HTMLElement => inviteCard(i, me, {
  people: { kind: 'members' }, hideGoingTag: true, onOpen: () => openInvite(i.id), onAbout: () => openSportInfo(i.sportId) });
const chatUnreadMap = (me: User) => new Map(chatSummaries(me.id).map((c) => [c.id, c.unread]));
const noInvites = () => h('div', { class: 'empty' }, h('h3', {}, 'No invites yet'), h('p', {}, 'Join a game from the map or create your own.'), h('a', { class: 'btn btn--primary', href: '#/map' }, 'Find a game'));

function incomingRow(r: FriendRequest): HTMLElement {
  const u = getUser(r.fromId)!;
  return h('li', { class: 'response response--unread' }, avatar(u, 'sm'), h('span', { class: 'grow' }, `${u.name} wants to be friends`),
    h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => { const x = acceptFriendRequest(r.id); toast(x.ok ? `You and ${u.name} are now friends.` : x.error); } }, 'Accept'),
    h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => confirmDialog({ title: `Decline ${u.name}'s request?`, body: `${u.name} will not be told, but the request will be removed.`,
      actions: [{ label: 'Keep request' }, { label: 'Decline', variant: 'danger', onClick: () => declineFriendRequest(r.id) }] }) }, 'Decline'));
}
function outgoingRow(r: FriendRequest): HTMLElement {
  const u = getUser(r.toId)!;
  return h('li', { class: 'response' }, avatar(u, 'sm'), h('span', { class: 'grow' }, `Waiting for ${u.name}`),
    h('button', { class: 'btn btn--text btn--sm', type: 'button', onClick: () => confirmDialog({ title: 'Cancel friend request?', body: `Your request to ${u.name} will be withdrawn. You can send a new one later.`,
      actions: [{ label: 'Keep request' }, { label: 'Cancel request', variant: 'danger', onClick: () => declineFriendRequest(r.id) }] }) }, 'Cancel'));
}
const noRequests = () => h('div', { class: 'empty empty--tight' }, 'No pending requests. Find people on an invite and tap Add friend.');

const messageBtn = (me: User, f: User) =>
  h('button', { class: 'btn btn--secondary btn--sm', type: 'button', 'aria-label': `Message ${f.name}`, onClick: () => go(`#/social/messages/${directChatId(me.id, f.id)}`) }, 'Message');
const noFriends = () => h('div', { class: 'empty' }, 'No friends yet. Add people you see on an invite.');

function confirmRemove(f: User): void {
  confirmDialog({
    title: `Remove ${f.name} as a friend?`,
    body: `You will no longer see each other's friends-only invites or plans, and your messages with ${f.name} will be deleted for both of you. ${f.name} will not be told. You can send a new request later.`,
    actions: [{ label: 'Keep friend' }, { label: 'Remove friend', variant: 'danger', onClick: () => { const x = removeFriend(f.id); toast(x.ok ? `${f.name} was removed from your friends.` : x.error); } }],
  });
}

// ---------- Overview ----------

function overview(): HTMLElement {
  const me = currentUser()!;
  const upcoming = myUpcoming(me.id);
  const plans = friendsPlans(me.id);
  const friends = me.friendIds.map((id) => getUser(id)!);
  const incoming = incomingRequests(me.id);
  const outgoing = outgoingRequests(me.id);
  const requests = [...incoming.map((r) => incomingRow(r)), ...outgoing.map((r) => outgoingRow(r))];
  markSeen('friend', 'friendInvite');   // requests and friends' new plans are previewed here, so they count as seen

  return h('div', {}, socialNav('overview'),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' },
        h('section', { 'aria-labelledby': 'mt-h' }, sectionHead('My invites', 'mt-h', '#/social/invites', upcoming.length),
          upcoming.length ? h('div', { class: 'card-list' }, upcoming.slice(0, PREVIEW.invites).map((i) => myInviteCard(me, i))) : noInvites()),
        h('section', { 'aria-labelledby': 'fp-h' }, sectionHead("Friends' plans", 'fp-h', '#/social/plans', plans.length),
          friendsPlansList(me, PREVIEW.plans, openInvite, openSportInfo, plans))),
      h('div', { class: 'stack' },
        h('section', { 'aria-labelledby': 'req-h' }, sectionHead('Requests', 'req-h', '#/social/requests', requests.length),
          requests.length ? h('ul', { class: 'response-list' }, requests.slice(0, PREVIEW.requests)) : noRequests()),
        h('section', { 'aria-labelledby': 'fr-h' }, sectionHead('Friends', 'fr-h', '#/social/friends', friends.length),
          friends.length ? h('div', { class: 'friend-grid' }, friends.slice(0, PREVIEW.friends).map((f) => h('div', { class: 'friend' }, avatar(f, 'lg'), h('span', {}, f.name), messageBtn(me, f))))
            : noFriends()))));
}

// ---------- Invites ----------

function invitesTab(): HTMLElement {
  const clear = () => { Object.assign(inviteF, { q: '', sport: 'all', time: 'any', unread: false }); draw(); };
  const filtered = () => !!inviteF.q.trim() || inviteF.sport !== 'all' || inviteF.time !== 'any' || inviteF.unread;
  const { el, draw } = listTab({
    tab: 'invites', searchLabel: 'Search invites', placeholder: 'Search sport, place or people', state: inviteF,
    controls: () => {
      const all = myUpcoming(currentUser()!.id);
      return [
        select('Sport', 'f-m-sport', inviteF.sport, sportOptions(all.map((i) => i.sportId)), (v) => { inviteF.sport = v; draw(); }),
        select('Time', 'f-m-time', inviteF.time, TIME_OPTIONS, (v) => { inviteF.time = v as TimeRange; draw(); }),
        h('button', { type: 'button', class: 'toggle', 'aria-pressed': inviteF.unread, dataset: { key: 'f-m-unread' }, onClick: () => { inviteF.unread = !inviteF.unread; draw(); } }, toggleBox(), 'Unread only'),
      ];
    },
    results: () => {
      const me = currentUser()!;
      const all = myUpcoming(me.id);
      if (!all.length) return [noInvites()];
      const chatN = chatUnreadMap(me);
      const unread = (i: Invite) => unreadCount(me.id, i.id) + (chatN.get(inviteChatId(i.id)) ?? 0) > 0;
      const shown = all.filter((i) => (inviteF.sport === 'all' || i.sportId === inviteF.sport) && inTime(i.start, inviteF.time)
        && (!inviteF.unread || unread(i)) && matches(inviteF.q, inviteWords(i)));
      return [countLine(shown.length, all.length, filtered(), clear),
        shown.length ? h('div', { class: 'card-list' }, shown.map((i) => myInviteCard(me, i))) : noMatch('invites', clear)];
    },
  });
  return el;
}

// ---------- Friends' plans ----------

function plansTab(): HTMLElement {
  markSeen('friendInvite');
  const clear = () => { Object.assign(planF, { q: '', sport: 'all', time: 'any', friend: 'all' }); draw(); };
  const filtered = () => !!planF.q.trim() || planF.sport !== 'all' || planF.time !== 'any' || planF.friend !== 'all';
  const { el, draw } = listTab({
    tab: 'plans', searchLabel: "Search friends' plans", placeholder: 'Search sport, place or people', state: planF,
    controls: () => {
      const all = friendsPlans(currentUser()!.id);
      const people = new Map(all.flatMap((p) => p.friends).map((f) => [f.id, f.name]));
      if (planF.friend !== 'all' && !people.has(planF.friend)) planF.friend = 'all';   // that friend no longer has plans (or was removed)
      return [
        select('Sport', 'f-p-sport', planF.sport, sportOptions(all.map((p) => p.invite.sportId)), (v) => { planF.sport = v; draw(); }),
        select('Time', 'f-p-time', planF.time, TIME_OPTIONS, (v) => { planF.time = v as TimeRange; draw(); }),
        select('Friend', 'f-p-friend', planF.friend, [['all', 'All friends'], ...[...people].sort((a, b) => a[1].localeCompare(b[1]))], (v) => { planF.friend = v; draw(); }),
      ];
    },
    results: () => {
      const me = currentUser()!;
      const all = friendsPlans(me.id);
      if (!all.length) return [friendsPlansList(me, null, openInvite, openSportInfo, all)];
      const shown = all.filter(({ invite: i, friends }) => (planF.sport === 'all' || i.sportId === planF.sport) && inTime(i.start, planF.time)
        && (planF.friend === 'all' || friends.some((f) => f.id === planF.friend)) && matches(planF.q, inviteWords(i)));
      return [countLine(shown.length, all.length, filtered(), clear),
        shown.length ? friendsPlansList(me, null, openInvite, openSportInfo, shown) : noMatch('plans', clear)];
    },
  });
  return el;
}

// ---------- Requests ----------

function requestsTab(): HTMLElement {
  markSeen('friend');
  const clear = () => { Object.assign(requestF, { q: '', dir: 'all' }); draw(); };
  const { el, draw } = listTab({
    tab: 'requests', searchLabel: 'Search requests', placeholder: 'Search by name', state: requestF,
    controls: () => {
      const me = currentUser()!;
      const inN = incomingRequests(me.id).length, outN = outgoingRequests(me.id).length;
      return [seg('f-r-dir', [{ value: 'all', label: `All (${inN + outN})` }, { value: 'incoming', label: `Incoming (${inN})` }, { value: 'sent', label: `Sent (${outN})` }],
        requestF.dir, (v) => { requestF.dir = v; draw(); })];
    },
    results: () => {
      const me = currentUser()!;
      const incoming = incomingRequests(me.id), outgoing = outgoingRequests(me.id);
      if (!incoming.length && !outgoing.length) return [noRequests()];
      const inShown = requestF.dir === 'sent' ? [] : incoming.filter((r) => matches(requestF.q, [getUser(r.fromId)!.name]));
      const outShown = requestF.dir === 'incoming' ? [] : outgoing.filter((r) => matches(requestF.q, [getUser(r.toId)!.name]));
      const total = (requestF.dir === 'sent' ? 0 : incoming.length) + (requestF.dir === 'incoming' ? 0 : outgoing.length);
      if (!inShown.length && !outShown.length) {
        if (!requestF.q.trim()) return [h('div', { class: 'empty empty--tight' }, requestF.dir === 'sent' ? 'You have no sent requests waiting.' : 'Nobody has sent you a request.')];
        return [noMatch('requests', clear)];
      }
      const group = (title: string, rows: HTMLElement[]) => rows.length ? h('section', { class: 'request-group' }, h('h2', { class: 'request-group__title' }, title), h('ul', { class: 'response-list' }, rows)) : null;
      return [countLine(inShown.length + outShown.length, total, !!requestF.q.trim(), clear),
        group(`Incoming (${inShown.length})`, inShown.map(incomingRow)),
        group(`Sent (${outShown.length})`, outShown.map(outgoingRow))];
    },
  });
  return el;
}

// ---------- Friends ----------

function friendsTab(): HTMLElement {
  markSeen('friend');
  const clear = () => { friendF.q = ''; draw(); };
  const { el, draw } = listTab({
    tab: 'friends', searchLabel: 'Search friends', placeholder: 'Search by name or area', state: friendF,
    controls: () => [seg('f-f-sort', [{ value: 'name', label: 'A to Z' }, { value: 'recent', label: 'Recently played' }], friendF.sort, (v) => { friendF.sort = v; draw(); })],
    results: () => {
      const me = currentUser()!;
      const all = me.friendIds.map((id) => getUser(id)!);
      if (!all.length) return [noFriends()];
      const last = new Map(all.map((f) => [f.id, lastPlayedWith(me.id, f.id)]));
      const byName = (a: User, b: User) => a.name.localeCompare(b.name);
      const shown = all.filter((f) => matches(friendF.q, [f.name, f.area]))
        .sort(friendF.sort === 'name' ? byName : (a, b) => (last.get(b.id) ?? -1) - (last.get(a.id) ?? -1) || byName(a, b));
      return [countLine(shown.length, all.length, !!friendF.q.trim(), clear),
        shown.length ? h('ul', { class: 'friend-list' }, shown.map((f) => {
          const when = last.get(f.id);
          return h('li', { class: 'friend-row' }, avatar(f),
            h('div', { class: 'grow' }, h('strong', {}, f.name),
              h('p', { class: 'card__meta' }, `${f.area} · ${when ? `Last played ${fmtAgo(when)}` : 'Not played together yet'}`)),
            messageBtn(me, f),
            h('button', { class: 'btn btn--danger btn--sm', type: 'button', 'aria-label': `Remove ${f.name} as a friend`, onClick: () => confirmRemove(f) }, 'Remove'));
        })) : noMatch('friends', clear)];
    },
  });
  return el;
}
