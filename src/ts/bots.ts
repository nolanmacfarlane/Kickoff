// Demo only: the other (fake) users react to what the signed-in user does, so the prototype feels alive.
// - Friend requests the user sends are accepted after a few seconds.
// - Invites the user creates get a few joiners over the next several seconds (who say hello in the chat).
// The signed-in user gets a toast for each (unless they turned that notification off).
// Only reacts to things done after the app starts; seeded requests and invites are left alone.
import {
  acceptFriendRequestAs, acceptInviteAs, canSee, currentUser, getInvite, getSport, getUser, getState, isFull, isPast, meetupChatId, outgoingRequests, sendMessageAs, subscribe,
} from './state';
import { toast } from './dom';
import type { Invite } from './types';

const FRIEND_DELAY: [number, number] = [2_000, 4_000];
const FIRST_JOIN_DELAY: [number, number] = [3_000, 5_000];
const NEXT_JOIN_DELAY: [number, number] = [4_000, 8_000];
const MAX_BOT_JOINERS = 3;
const GREETINGS = ['Count me in!', 'See you there!', 'Looking forward to it.', 'Thanks for organising!', 'I can be there a bit early.'];

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);
const shuffle = <T>(xs: T[]): T[] => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

const seenRequests = new Set<string>();
const seenInvites = new Set<string>();

/** Bots that could join: not the signed-in user, not already in it, allowed to see it. People who play or want the sport go first. */
function candidates(inv: Invite, humanId: string): string[] {
  const users = Object.values(getState().users).filter((u) => u.id !== humanId && !inv.memberIds.includes(u.id) && canSee(inv, u.id));
  const keen = (id: string) => { const u = getState().users[id]; return u.currentSports.some((s) => s.sportId === inv.sportId) || u.desiredSports.includes(inv.sportId); };
  const ids = shuffle(users.map((u) => u.id));
  return [...ids.filter(keen), ...ids.filter((id) => !keen(id))];
}

function scheduleJoins(inviteId: string, humanId: string): void {
  const inv = getInvite(inviteId);
  if (!inv) return;
  // leave a spot open so the invite stays on the map, unless it only has room for one more
  const target = Math.min(MAX_BOT_JOINERS, Math.max(1, inv.capacity - inv.memberIds.length - 1));
  const queue = candidates(inv, humanId).slice(0, target);
  const lines = shuffle(GREETINGS);   // different hello from each joiner
  let delay = between(FIRST_JOIN_DELAY);
  queue.forEach((botId, n) => {
    setTimeout(() => {
      const live = getInvite(inviteId);
      if (!live || isFull(live) || isPast(live)) return;   // deleted, filled or over in the meantime
      if (!acceptInviteAs(botId, inviteId, Date.now(), true).ok) return;
      const host = currentUser();
      if (host?.id === live.hostId && host.settings.notify.joins) toast(`${getUser(botId)!.name} joined your ${getSport(live.sportId)!.name} meetup${isFull(live) ? '. It is now full' : ''}`);
      setTimeout(() => sendMessageAs(botId, meetupChatId(inviteId), lines[n % lines.length]), between([1_000, 2_500]));
    }, delay);
    delay += between(NEXT_JOIN_DELAY);
  });
}

function scan(): void {
  const me = currentUser();
  if (!me) return;
  outgoingRequests(me.id).forEach((r) => {
    if (seenRequests.has(r.id)) return;
    seenRequests.add(r.id);
    setTimeout(() => {
      if (!acceptFriendRequestAs(r.toId, r.id).ok) return;   // cancelled meanwhile
      const now = currentUser();
      if (now?.id === r.fromId && now.settings.notify.friends) toast(`${getUser(r.toId)!.name} accepted your friend request`);
    }, between(FRIEND_DELAY));
  });
  getState().invites.forEach((inv) => {
    if (seenInvites.has(inv.id)) return;
    seenInvites.add(inv.id);
    if (inv.hostId === me.id && inv.memberIds.length === 1) scheduleJoins(inv.id, me.id);
  });
}

export function startDemoBots(): void {
  const s = getState();
  s.friendRequests.forEach((r) => seenRequests.add(r.id));
  s.invites.forEach((i) => seenInvites.add(i.id));
  subscribe(scan);
}
