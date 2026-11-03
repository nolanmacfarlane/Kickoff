// The single source of truth. Views READ via selectors and CHANGE data only via actions.
// All invite rules (full = hidden, host handover, tag locking, friends-only, friend requests) live here.
import { defaultSettings, seedInvites, seedUsers, sports, venues } from './data';
import type {
  ActivityItem, AppState, ChatSummary, FriendRequest, FriendStatus, Invite, Message, NewInviteInput, Notification, NotificationKind,
  Result, SettingsPatch, TagEdit, User,
} from './types';

let st: AppState;
let counter = 1000;
const listeners = new Set<() => void>();
const nid = (p: string) => `${p}-${++counter}`;
const ok = (id?: string): Result => ({ ok: true, id });
const fail = (error: string): Result => ({ ok: false, error });

export const MIN_CAPACITY = 2;
export const MAX_CAPACITY = 30;

// ---------- lifecycle ----------

export function initState(now = Date.now()): void {
  st = { currentUserId: null, users: seedUsers(), invites: seedInvites(now), notifications: [], activity: [], friendRequests: [], messages: [], chatReads: {} };
  // a little history for the demo user so badges, requests and Recent Activity are not empty
  notify('u-demo', 'i-11', 'Maya joined your Soccer meetup', now - 2 * 3_600_000, 'join');
  notify('u-demo', 'i-11', 'Chen joined your Soccer meetup', now - 1 * 3_600_000, 'join');
  log('u-demo', 'You hosted Soccer at Beacon Hill Park Fields', now - 48 * 3_600_000, 'i-12');
  st.friendRequests.push({ id: nid('fr'), fromId: 'u-priya', toId: 'u-demo', createdAt: now - 3 * 3_600_000 });
  notify('u-demo', null, 'Priya sent you a friend request', now - 3 * 3_600_000, 'friend');
  st.friendRequests.push({ id: nid('fr'), fromId: 'u-demo', toId: 'u-chen', createdAt: now - 5 * 3_600_000 });
  // seeded chats: Maya and Tom (friends) and the group chat for Alex's own meetup
  const M = 60_000, H = 3_600_000;
  const maya = directChatId('u-demo', 'u-maya'), tom = directChatId('u-demo', 'u-tom'), group = meetupChatId('i-11');
  addMessage(maya, 'u-maya', 'Are you coming Thursday?', now - 5 * H);
  addMessage(maya, 'u-demo', 'Yes, I can bring a ball.', now - 4.5 * H);
  addMessage(maya, 'u-maya', 'Great, see you there!', now - 40 * M);
  addMessage(tom, 'u-tom', 'Cages on Friday? I have a spare glove if you want to try.', now - 26 * H);
  addMessage(group, null, 'Maya joined', now - 2 * H);
  addMessage(group, 'u-maya', 'I can bring cones.', now - 100 * M);
  addMessage(group, null, 'Chen joined', now - 1 * H);
  addMessage(group, 'u-chen', 'See you at 6!', now - 30 * M);
  st.chatReads['u-demo'] = { [maya]: now - 4 * H, [group]: now - 3 * H };   // later messages are unread
  emit();
}

export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
function emit(): void { listeners.forEach((fn) => fn()); }

function wants(user: User | undefined, kind: NotificationKind): boolean {
  if (!user) return false;
  if (kind === 'join') return user.settings.notify.joins;
  if (kind === 'leave') return user.settings.notify.leaves;
  if (kind === 'friend') return user.settings.notify.friends;
  if (kind === 'friendInvite') return user.settings.notify.friendInvites;
  return true;
}
/** Respects the recipient's notification settings. */
function notify(userId: string, inviteId: string | null, text: string, createdAt = Date.now(), kind: NotificationKind = 'other'): void {
  if (!wants(st.users[userId], kind)) return;
  st.notifications.unshift({ id: nid('n'), userId, inviteId, kind, text, createdAt, read: false });
}
function log(userId: string, text: string, at = Date.now(), inviteId: string | null = null): void {
  st.activity.unshift({ id: nid('a'), userId, text, at, inviteId });
}

// ---------- selectors ----------

export const getState = (): AppState => st;
export const getUser = (id: string): User | undefined => st.users[id];
export const currentUser = (): User | null => (st.currentUserId ? st.users[st.currentUserId] ?? null : null);
export const getInvite = (id: string): Invite | undefined => st.invites.find((i) => i.id === id);
export const getSport = (id: string) => sports.find((s) => s.id === id);
export const getVenue = (id: string) => venues.find((v) => v.id === id);

export const isFull = (inv: Invite): boolean => inv.memberIds.length >= inv.capacity;
export const isPast = (inv: Invite, now = Date.now()): boolean => inv.end < now;
export const spotsLeft = (inv: Invite): number => inv.capacity - inv.memberIds.length;
/** Tags are editable by the host only while the host is alone. */
export const tagsLocked = (inv: Invite): boolean => inv.memberIds.length > 1;

/** Can this user see the invite? Friends-only invites are visible to the host's friends and members. */
export function canSee(inv: Invite, userId: string): boolean {
  if (inv.memberIds.includes(userId)) return true;
  if (inv.visibility === 'open') return true;
  const host = st.users[inv.hostId];
  return !!host && host.friendIds.includes(userId);
}

/** Map pins: upcoming, not full, and visible to this user. Full invites vanish for everyone. */
export function mapInvites(userId: string, now = Date.now()): Invite[] {
  return st.invites.filter((i) => !isPast(i, now) && !isFull(i) && canSee(i, userId));
}
export function myUpcoming(userId: string, now = Date.now()): Invite[] {
  return st.invites.filter((i) => i.memberIds.includes(userId) && !isPast(i, now)).sort((a, b) => a.start - b.start);
}
export function myPast(userId: string, now = Date.now()): Invite[] {
  return st.invites.filter((i) => i.memberIds.includes(userId) && isPast(i, now)).sort((a, b) => b.start - a.start);
}

export const notificationsFor = (userId: string): Notification[] => st.notifications.filter((n) => n.userId === userId);
export const unreadCount = (userId: string, inviteId?: string): number =>
  st.notifications.filter((n) => n.userId === userId && !n.read && (inviteId === undefined || n.inviteId === inviteId)).length;
export const activityFor = (userId: string): ActivityItem[] => st.activity.filter((a) => a.userId === userId);

// ---------- friends ----------

export const incomingRequests = (userId: string): FriendRequest[] => st.friendRequests.filter((r) => r.toId === userId);
export const outgoingRequests = (userId: string): FriendRequest[] => st.friendRequests.filter((r) => r.fromId === userId);

export function friendStatus(otherId: string): FriendStatus {
  const me = currentUser();
  if (!me || otherId === me.id) return 'self';
  if (me.friendIds.includes(otherId)) return 'friend';
  if (st.friendRequests.some((r) => r.fromId === me.id && r.toId === otherId)) return 'requested';
  if (st.friendRequests.some((r) => r.fromId === otherId && r.toId === me.id)) return 'incoming';
  return 'none';
}
export const requestFrom = (otherId: string): FriendRequest | undefined =>
  st.friendRequests.find((r) => r.fromId === otherId && r.toId === st.currentUserId);

/** People the user can discover: anyone on an invite the user can open (you do not need to be a member). */
export function knownPeople(userId: string, now = Date.now()): Set<string> {
  const ids = new Set<string>();
  st.invites
    .filter((i) => canSee(i, userId) && (i.memberIds.includes(userId) || (!isPast(i, now) && !isFull(i))))
    .forEach((i) => i.memberIds.forEach((id) => { if (id !== userId) ids.add(id); }));
  return ids;
}
export const canRequestFriend = (otherId: string): boolean => {
  const me = currentUser();
  return !!me && friendStatus(otherId) === 'none' && knownPeople(me.id).has(otherId);
};

export function sendFriendRequest(otherId: string): Result {
  const me = currentUser();
  const other = getUser(otherId);
  if (!me || !other) return fail('User not found.');
  if (!canRequestFriend(otherId)) return fail('You can only request people you have seen on an invite.');
  st.friendRequests.push({ id: nid('fr'), fromId: me.id, toId: otherId, createdAt: Date.now() });
  notify(otherId, null, `${me.name} sent you a friend request`, Date.now(), 'friend');
  log(me.id, `You sent ${other.name} a friend request`);
  emit();
  return ok();
}
export function acceptFriendRequest(requestId: string): Result { return acceptFriendRequestAs(st.currentUserId, requestId); }
/** Demo bots use this to accept a request on behalf of someone who is not signed in. */
export function acceptFriendRequestAs(userId: string | null, requestId: string): Result {
  const me = userId ? st.users[userId] : undefined;
  const req = st.friendRequests.find((r) => r.id === requestId);
  if (!me || !req || req.toId !== me.id) return fail('Request not found.');
  const from = getUser(req.fromId)!;
  me.friendIds.push(from.id);
  from.friendIds.push(me.id);
  st.friendRequests = st.friendRequests.filter((r) => r.id !== requestId);
  notify(from.id, null, `${me.name} accepted your friend request`, Date.now(), 'friend');
  log(me.id, `You and ${from.name} are now friends`);
  emit();
  return ok();
}
/** Decline an incoming request, or cancel one you sent. */
export function declineFriendRequest(requestId: string): Result {
  const me = currentUser();
  const req = st.friendRequests.find((r) => r.id === requestId);
  if (!me || !req || (req.toId !== me.id && req.fromId !== me.id)) return fail('Request not found.');
  st.friendRequests = st.friendRequests.filter((r) => r.id !== requestId);
  emit();
  return ok();
}

/** Unfriend, both ways. The other person is not told. Your direct chat is deleted for both of you. */
export function removeFriend(otherId: string): Result {
  const me = currentUser();
  const other = getUser(otherId);
  if (!me || !other || !me.friendIds.includes(otherId)) return fail('You are not friends with this person.');
  me.friendIds = me.friendIds.filter((id) => id !== otherId);
  other.friendIds = other.friendIds.filter((id) => id !== me.id);
  const chat = directChatId(me.id, otherId);
  st.messages = st.messages.filter((m) => m.chatId !== chat);
  for (const id of [me.id, otherId]) if (st.chatReads[id]) delete st.chatReads[id][chat];
  log(me.id, `You removed ${other.name} as a friend`);
  emit();
  return ok();
}

/** When you last played with someone (start of the most recent past meetup you were both in), or null. */
export function lastPlayedWith(userId: string, otherId: string, now = Date.now()): number | null {
  const shared = st.invites.filter((i) => isPast(i, now) && i.memberIds.includes(userId) && i.memberIds.includes(otherId));
  return shared.length ? Math.max(...shared.map((i) => i.start)) : null;
}

// ---------- auth / profile / settings ----------

export function loginDemo(): void { st.currentUserId = 'u-demo'; emit(); }
export function logout(): void { st.currentUserId = null; emit(); }

export function completeOnboarding(profile: Omit<User, 'id' | 'avatarColor' | 'friendIds' | 'settings'>): Result {
  if (!profile.name.trim()) return fail('Please enter your name.');
  if (!profile.address.trim()) return fail('Please enter your address.');
  if (profile.motivations.length === 0) return fail('Pick at least one thing you are looking for.');
  const id = nid('u');
  const colors = ['#e07a5f', '#3d85c6', '#81b29a', '#9b72cf', '#4aa3a2'];
  st.users[id] = {
    ...profile, id, avatarColor: colors[counter % colors.length], friendIds: [], // new users start with no friends
    settings: defaultSettings(),
  };
  st.currentUserId = id;
  emit();
  return ok(id);
}

export function updateProfile(patch: Partial<Omit<User, 'id' | 'friendIds' | 'settings'>>): Result {
  const me = currentUser();
  if (!me) return fail('Not signed in.');
  Object.assign(me, patch);
  emit();
  return ok();
}

export function updateSettings(patch: SettingsPatch): Result {
  const me = currentUser();
  if (!me) return fail('Not signed in.');
  me.settings = { ...me.settings, ...patch, notify: { ...me.settings.notify, ...patch.notify } };
  emit();
  return ok();
}

// ---------- invite actions ----------

/** Your other upcoming meetups that overlap this time (back-to-back is fine). */
export function conflictsFor(userId: string, start: number, end: number, ignoreInviteId?: string, now = Date.now()): Invite[] {
  return st.invites.filter((i) => i.id !== ignoreInviteId && i.memberIds.includes(userId) && !isPast(i, now) && i.start < end && start < i.end).sort((a, b) => a.start - b.start);
}

export function createInvite(input: NewInviteInput, now = Date.now(), force = false): Result {
  const me = currentUser();
  if (!me) return fail('Not signed in.');
  if (!getSport(input.sportId)) return fail('Choose a sport.');
  if (!input.location || !input.location.label) return fail('Choose a location.');
  if (!Number.isInteger(input.capacity) || input.capacity < MIN_CAPACITY) return fail(`Enter how many people, at least ${MIN_CAPACITY} (including you).`);
  if (input.capacity > MAX_CAPACITY) return fail(`Capacity can be at most ${MAX_CAPACITY}.`);
  if (input.skills.length === 0) return fail('Choose at least one skill level.');
  if (!(input.start > now)) return fail('Start time must be in the future.');
  if (!(input.end > input.start)) return fail('End time must be after the start time.');
  if (input.gear.available && !input.gear.description.trim()) return fail('Describe the gear you can share, or untick the box.');
  const clash = conflictsFor(me.id, input.start, input.end, undefined, now);
  if (clash.length && !force) return { ok: false, error: 'This overlaps with a meetup you are already going to.', conflicts: clash };
  const inv: Invite = { ...input, id: nid('i'), hostId: me.id, memberIds: [me.id] };
  st.invites.push(inv);
  me.friendIds.forEach((fid) => notify(fid, inv.id, `${me.name} created a ${getSport(inv.sportId)!.name} meetup`, now, 'friendInvite'));
  log(me.id, `You created a ${getSport(inv.sportId)!.name} invite at ${inv.location.label}`, now, inv.id);
  emit();
  return ok(inv.id);
}

export function acceptInvite(inviteId: string, now = Date.now(), force = false): Result { return acceptInviteAs(st.currentUserId, inviteId, now, force); }
/** Demo bots use this to join on behalf of someone who is not signed in. Same rules as acceptInvite. */
export function acceptInviteAs(userId: string | null, inviteId: string, now = Date.now(), force = false): Result {
  const me = userId ? st.users[userId] : undefined;
  const inv = getInvite(inviteId);
  if (!me) return fail('Not signed in.');
  if (!inv) return fail('This invite no longer exists.');
  if (isPast(inv, now)) return fail('This invite has already happened.');
  if (inv.memberIds.includes(me.id)) return fail('You already joined this invite.');
  if (!canSee(inv, me.id)) return fail('This invite is for the host\'s friends only.');
  if (isFull(inv)) return fail('This invite is full.');
  const clash = conflictsFor(me.id, inv.start, inv.end, inv.id, now);
  if (clash.length && !force) return { ok: false, error: 'This overlaps with a meetup you are already going to.', conflicts: clash };
  inv.memberIds.push(me.id);
  const sport = getSport(inv.sportId)!.name;
  inv.memberIds.filter((id) => id !== me.id).forEach((id) => notify(id, inv.id, `${me.name} joined your ${sport} meetup`, now, 'join'));
  if (isFull(inv)) inv.memberIds.forEach((id) => notify(id, inv.id, `Your ${sport} meetup is now full`, now, 'join'));
  log(me.id, `You joined ${sport} at ${inv.location.label}`, now, inv.id);
  addMessage(meetupChatId(inv.id), null, `${me.name} joined`, now);
  emit();
  return ok(inv.id);
}

export function leaveInvite(inviteId: string, now = Date.now()): Result {
  const me = currentUser();
  const inv = getInvite(inviteId);
  if (!me || !inv) return fail('Invite not found.');
  if (!inv.memberIds.includes(me.id)) return fail('You are not in this invite.');
  const sport = getSport(inv.sportId)!.name;
  const wasHost = inv.hostId === me.id;
  inv.memberIds = inv.memberIds.filter((id) => id !== me.id);
  log(me.id, `You left ${sport} at ${inv.location.label}`, now, inv.id);
  if (inv.memberIds.length === 0) {
    st.invites = st.invites.filter((i) => i.id !== inv.id); // nobody left: delete the invite and its chat
    st.messages = st.messages.filter((m) => m.chatId !== meetupChatId(inv.id));
  } else {
    addMessage(meetupChatId(inv.id), null, `${me.name} left`, now);
    if (wasHost) {
      inv.hostId = inv.memberIds[0]; // next member (earliest joiner) becomes host
      addMessage(meetupChatId(inv.id), null, `${getUser(inv.hostId)!.name} is now the host`, now);
      notify(inv.hostId, inv.id, `${me.name} left. You are now the host of ${sport}`, now, 'other');
    }
    inv.memberIds.filter((id) => id !== inv.hostId || !wasHost).forEach((id) => notify(id, inv.id, `${me.name} left your ${sport} meetup`, now, 'leave'));
  }
  emit();
  return ok();
}

/** Host-only, and only while the host is alone. Changing tags never touches capacity, time or place. */
export function editInviteTags(inviteId: string, edit: TagEdit): Result {
  const me = currentUser();
  const inv = getInvite(inviteId);
  if (!me || !inv) return fail('Invite not found.');
  if (inv.hostId !== me.id) return fail('Only the host can edit this invite.');
  if (tagsLocked(inv)) return fail('Tags are locked once someone has joined.');
  if (edit.skills && edit.skills.length === 0) return fail('Keep at least one skill level selected.');
  Object.assign(inv, edit);
  emit();
  return ok();
}

// ---------- chats ----------

export const directChatId = (a: string, b: string): string => `dm:${[a, b].sort().join(':')}`;
export const meetupChatId = (inviteId: string): string => `meetup:${inviteId}`;

function addMessage(chatId: string, senderId: string | null, text: string, at = Date.now()): Message {
  const m: Message = { id: nid('m'), chatId, senderId, text, at };
  st.messages.push(m);
  return m;
}

/** What this user may do in a chat, or null if they have no access. Direct chats need friends; meetup chats need membership. */
function chatAccess(chatId: string, userId: string): { kind: 'direct' | 'meetup'; inviteId?: string; friendId?: string; readOnly: boolean } | null {
  const me = st.users[userId];
  if (!me) return null;
  if (chatId.startsWith('dm:')) {
    const ids = chatId.slice(3).split(':');
    const friendId = ids.find((id) => id !== userId);
    if (ids.length !== 2 || !ids.includes(userId) || !friendId || !me.friendIds.includes(friendId)) return null;
    return { kind: 'direct', friendId, readOnly: false };
  }
  if (chatId.startsWith('meetup:')) {
    const inv = getInvite(chatId.slice(7));
    if (!inv || !inv.memberIds.includes(userId)) return null;
    return { kind: 'meetup', inviteId: inv.id, readOnly: isPast(inv) };
  }
  return null;
}

export const messagesIn = (chatId: string): Message[] => st.messages.filter((m) => m.chatId === chatId).sort((a, b) => a.at - b.at);
const chatUnread = (userId: string, chatId: string): number => {
  const readAt = st.chatReads[userId]?.[chatId] ?? 0;
  return st.messages.filter((m) => m.chatId === chatId && m.senderId !== null && m.senderId !== userId && m.at > readAt).length;
};

/** Every friend (so you can start a chat) and every meetup you are in (or were in, if it has messages). Newest first. */
export function chatSummaries(userId: string, now = Date.now()): ChatSummary[] {
  const me = st.users[userId];
  if (!me) return [];
  const ids = [
    ...me.friendIds.map((f) => directChatId(userId, f)),
    ...st.invites.filter((i) => i.memberIds.includes(userId) && (!isPast(i, now) || messagesIn(meetupChatId(i.id)).length)).map((i) => meetupChatId(i.id)),
  ];
  return ids.flatMap((id) => {
    const access = chatAccess(id, userId);
    if (!access) return [];
    const msgs = messagesIn(id);
    return [{ id, ...access, last: msgs[msgs.length - 1], unread: chatUnread(userId, id) }];
  }).sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0));
}
export const unreadMessages = (userId: string): number => chatSummaries(userId).reduce((n, c) => n + c.unread, 0);

export function sendMessage(chatId: string, text: string, now = Date.now()): Result { return sendMessageAs(st.currentUserId, chatId, text, now); }
/** Demo bots use this to post on behalf of someone who is not signed in. */
export function sendMessageAs(userId: string | null, chatId: string, text: string, now = Date.now()): Result {
  const me = userId ? st.users[userId] : undefined;
  if (!me) return fail('Not signed in.');
  const access = chatAccess(chatId, me.id);
  if (!access) return fail('You cannot message here.');
  if (access.readOnly) return fail('This meetup has ended, so its chat is read only.');
  const clean = text.trim();
  if (!clean) return fail('Type a message first.');
  if (clean.length > 500) return fail('Messages can be up to 500 characters.');
  addMessage(chatId, me.id, clean, now);
  st.chatReads[me.id] = { ...st.chatReads[me.id], [chatId]: now };   // your own message means you have read the chat
  emit();
  return ok();
}

/** Marks everything in the chat as read. Does nothing (and does not re-render) if there is nothing unread. */
export function markChatRead(chatId: string, now = Date.now()): void {
  const me = currentUser();
  if (!me || !chatAccess(chatId, me.id) || chatUnread(me.id, chatId) === 0) return;
  st.chatReads[me.id] = { ...st.chatReads[me.id], [chatId]: now };
  emit();
}

// ---------- friends' plans ----------

/** Upcoming invites you can see, are not in yet, and at least one friend is going to. Soonest first. */
export function friendsPlans(userId: string, now = Date.now()): { invite: Invite; friends: User[] }[] {
  const me = st.users[userId];
  if (!me) return [];
  return st.invites
    .filter((i) => !isPast(i, now) && canSee(i, userId) && !i.memberIds.includes(userId))
    .map((invite) => ({ invite, friends: invite.memberIds.filter((id) => me.friendIds.includes(id)).map((id) => st.users[id]) }))
    .filter((p) => p.friends.length > 0)
    .sort((a, b) => a.invite.start - b.invite.start);
}

export function markInviteRead(inviteId: string): void {
  const me = currentUser();
  if (!me) return;
  st.notifications.forEach((n) => { if (n.userId === me.id && n.inviteId === inviteId) n.read = true; });
  emit();
}
/** Marks some kinds of notification as read (e.g. friend requests when the Social tab is opened). No re-render if there is nothing to mark. */
export function markKindRead(...kinds: NotificationKind[]): void {
  const me = currentUser();
  if (!me) return;
  let changed = false;
  st.notifications.forEach((n) => { if (n.userId === me.id && kinds.includes(n.kind) && !n.read) { n.read = true; changed = true; } });
  if (changed) emit();
}
export function markAllRead(): void {
  const me = currentUser();
  if (!me) return;
  st.notifications.forEach((n) => { if (n.userId === me.id) n.read = true; });
  emit();
}

initState();
