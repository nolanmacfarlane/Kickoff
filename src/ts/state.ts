// The single source of truth. Views READ via selectors and CHANGE data only via actions.
// All invite rules (full = hidden, host handover, tag locking, friends-only) live here.
import { seedInvites, seedUsers, sports, venues } from './data';
import type {
  ActivityItem, AppState, Invite, NewInviteInput, Notification, Result, TagEdit, User,
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

export function initState(now = Date.now()): void
{
  st = { currentUserId: null, users: seedUsers(), invites: seedInvites(now), notifications: [], activity: [] };
  // seed a little history for the demo user so bell badges and Recent Activity are not empty
  notify('u-demo', 'i-11', 'Maya joined your Soccer meetup', now - 2 * 3_600_000);
  notify('u-demo', 'i-11', 'Chen joined your Soccer meetup', now - 1 * 3_600_000);
  log('u-demo', 'You hosted Soccer at Beacon Hill Park Fields', now - 48 * 3_600_000, 'i-12');
  emit();
}

export function subscribe(fn: () => void): () => void
{
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(): void { listeners.forEach((fn) => fn()); }

function notify(userId: string, inviteId: string | null, text: string, createdAt = Date.now()): void
{
  st.notifications.unshift({ id: nid('n'), userId, inviteId, text, createdAt, read: false });
}
function log(userId: string, text: string, at = Date.now(), inviteId: string | null = null): void
{
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
export function canSee(inv: Invite, userId: string): boolean
{
  if (inv.memberIds.includes(userId)) return true;
  if (inv.visibility === 'open') return true;
  const host = st.users[inv.hostId];
  return !!host && host.friendIds.includes(userId);
}

/** Map pins: upcoming, not full, and visible to this user. Full invites vanish for everyone. */
export function mapInvites(userId: string, now = Date.now()): Invite[]
{
  return st.invites.filter((i) => !isPast(i, now) && !isFull(i) && canSee(i, userId));
}

export function myUpcoming(userId: string, now = Date.now()): Invite[]
{
  return st.invites.filter((i) => i.memberIds.includes(userId) && !isPast(i, now)).sort((a, b) => a.start - b.start);
}
export function myPast(userId: string, now = Date.now()): Invite[]
{
  return st.invites.filter((i) => i.memberIds.includes(userId) && isPast(i, now)).sort((a, b) => b.start - a.start);
}

export const notificationsFor = (userId: string): Notification[] => st.notifications.filter((n) => n.userId === userId);
export const unreadCount = (userId: string, inviteId?: string): number =>
  st.notifications.filter((n) => n.userId === userId && !n.read && (inviteId === undefined || n.inviteId === inviteId)).length;
export const activityFor = (userId: string): ActivityItem[] => st.activity.filter((a) => a.userId === userId);

/** Everyone who shares (or shared) an invite with the user, minus existing friends and self. Used for Add Friend. */
export function canAddFriend(otherId: string): boolean
{
  const me = currentUser();
  if (!me || me.id === otherId || me.friendIds.includes(otherId)) return false;
  return st.invites.some((i) => i.memberIds.includes(me.id) && i.memberIds.includes(otherId));
}

// ---------- auth / profile ----------

export function loginDemo(): void { st.currentUserId = 'u-demo'; emit(); }
export function logout(): void { st.currentUserId = null; emit(); }

export function completeOnboarding(profile: Omit<User, 'id' | 'avatarColor' | 'friendIds'>): Result
{
  if (!profile.name.trim()) return fail('Please enter a name.');
  if (!profile.area.trim()) return fail('Please choose where you are located.');
  if (profile.motivations.length === 0) return fail('Pick at least one motivation.');
  const id = nid('u');
  const colors = ['#e07a5f', '#3d85c6', '#81b29a', '#9b72cf', '#4aa3a2'];
  st.users[id] = { ...profile, id, avatarColor: colors[counter % colors.length], friendIds: [] }; // new users start with no friends
  st.currentUserId = id;
  emit();
  return ok(id);
}

export function updateProfile(patch: Partial<Omit<User, 'id' | 'friendIds'>>): Result
{
  const me = currentUser();
  if (!me) return fail('Not signed in.');
  Object.assign(me, patch);
  emit();
  return ok();
}

// ---------- invite actions ----------

export function createInvite(input: NewInviteInput, now = Date.now()): Result
{
  const me = currentUser();
  if (!me) return fail('Not signed in.');
  if (!getSport(input.sportId)) return fail('Choose a sport.');
  if (!input.location || !input.location.label) return fail('Choose a location.');
  if (!Number.isInteger(input.capacity) || input.capacity < MIN_CAPACITY) return fail(`Capacity must be at least ${MIN_CAPACITY} (including you).`);
  if (input.capacity > MAX_CAPACITY) return fail(`Capacity can be at most ${MAX_CAPACITY}.`);
  if (!(input.start > now)) return fail('Start time must be in the future.');
  if (!(input.end > input.start)) return fail('End time must be after the start time.');
  if (input.gear.available && !input.gear.description.trim()) return fail('Describe the gear you can share, or untick the box.');
  const inv: Invite = { ...input, id: nid('i'), hostId: me.id, memberIds: [me.id] };
  st.invites.push(inv);
  log(me.id, `You created a ${getSport(inv.sportId)!.name} invite at ${inv.location.label}`, now, inv.id);
  emit();
  return ok(inv.id);
}

export function acceptInvite(inviteId: string, now = Date.now()): Result
{
  const me = currentUser();
  const inv = getInvite(inviteId);
  if (!me) return fail('Not signed in.');
  if (!inv) return fail('This invite no longer exists.');
  if (isPast(inv, now)) return fail('This invite has already happened.');
  if (inv.memberIds.includes(me.id)) return fail('You already joined this invite.');
  if (!canSee(inv, me.id)) return fail('This invite is for the host\'s friends only.');
  if (isFull(inv)) return fail('This invite is full.');
  inv.memberIds.push(me.id);
  const sport = getSport(inv.sportId)!.name;
  inv.memberIds.filter((id) => id !== me.id).forEach((id) => notify(id, inv.id, `${me.name} joined your ${sport} meetup`, now));
  if (isFull(inv)) inv.memberIds.forEach((id) => notify(id, inv.id, `Your ${sport} meetup is now full`, now));
  log(me.id, `You joined ${sport} at ${inv.location.label}`, now, inv.id);
  emit();
  return ok(inv.id);
}

export function leaveInvite(inviteId: string, now = Date.now()): Result
{
  const me = currentUser();
  const inv = getInvite(inviteId);
  if (!me || !inv) return fail('Invite not found.');
  if (!inv.memberIds.includes(me.id)) return fail('You are not in this invite.');
  const sport = getSport(inv.sportId)!.name;
  const wasHost = inv.hostId === me.id;
  inv.memberIds = inv.memberIds.filter((id) => id !== me.id);
  log(me.id, `You left ${sport} at ${inv.location.label}`, now, inv.id);
  if (inv.memberIds.length === 0)
  {
    st.invites = st.invites.filter((i) => i.id !== inv.id); // nobody left: delete
  } else
  {
    if (wasHost)
    {
      inv.hostId = inv.memberIds[0]; // next member (earliest joiner) becomes host
      notify(inv.hostId, inv.id, `${me.name} left. You are now the host of ${sport}`, now);
    }
    inv.memberIds.filter((id) => id !== inv.hostId || !wasHost).forEach((id) => notify(id, inv.id, `${me.name} left your ${sport} meetup`, now));
  }
  emit();
  return ok();
}

/** Host-only, and only while the host is alone. Changing tags never touches capacity, time or place. */
export function editInviteTags(inviteId: string, edit: TagEdit): Result
{
  const me = currentUser();
  const inv = getInvite(inviteId);
  if (!me || !inv) return fail('Invite not found.');
  if (inv.hostId !== me.id) return fail('Only the host can edit this invite.');
  if (tagsLocked(inv)) return fail('Tags are locked once someone has joined.');
  Object.assign(inv, edit);
  emit();
  return ok();
}

// ---------- social ----------

export function addFriend(otherId: string): Result
{
  const me = currentUser();
  const other = getUser(otherId);
  if (!me || !other) return fail('User not found.');
  if (!canAddFriend(otherId)) return fail('You can add people you have shared a meetup with.');
  me.friendIds.push(otherId);
  other.friendIds.push(me.id); // mutual for the prototype (no friend-request flow)
  notify(otherId, null, `${me.name} added you as a friend`);
  log(me.id, `You added ${other.name} as a friend`);
  emit();
  return ok();
}

export function markInviteRead(inviteId: string): void
{
  const me = currentUser();
  if (!me) return;
  st.notifications.forEach((n) => { if (n.userId === me.id && n.inviteId === inviteId) n.read = true; });
  emit();
}

initState();
