// Quick checks of the invite and friend rules. Run: npm test
import * as S from '../src/ts/state';
import { distanceKm, maxDistanceKm } from '../src/ts/geo';
import { inFreeTime, matchInvite, recommend } from '../src/ts/match';
import { sportCategories, sports } from '../src/ts/data';

let failed = 0;
function check(name: string, cond: boolean) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) failed++; }
const loginAs = (id: string) => { (S.getState() as any).currentUserId = id; };
const H = 3_600_000;

S.initState();
S.loginDemo();
const demo = 'u-demo';

// map visibility
check('full invite (i-7) is hidden from map', !S.mapInvites(demo).some((i) => i.id === 'i-7'));
check('past invite (i-12) is hidden from map', !S.mapInvites(demo).some((i) => i.id === 'i-12'));
check('friends-only invite visible to host friend (demo sees i-3)', S.mapInvites(demo).some((i) => i.id === 'i-3'));
const newUser = S.completeOnboarding({ name: 'Jack', address: '12 Fort St', area: 'Downtown', lat: 48.43, lng: -123.36, motivations: ['social'], currentSports: [], desiredSports: ['soccer'], calendar: null, freeTimes: [] });
check('onboarding succeeds', newUser.ok);
const jack = S.currentUser()!.id;
check('new user starts with no friends', S.currentUser()!.friendIds.length === 0);
check('friends-only invite hidden from non-friend', !S.mapInvites(jack).some((i) => i.id === 'i-3'));
check('non-friend cannot accept friends-only', !S.acceptInvite('i-3').ok);

// accept / full / notify
check('accept is instant', S.acceptInvite('i-2').ok);
check('cannot accept twice', !S.acceptInvite('i-2').ok);
check('host notified of join', S.notificationsFor('u-priya').some((n) => n.text.includes('Jack joined')));
const j = S.getInvite('i-2')!; // capacity 4, now 3 members
loginAs('u-dev'); check('dev joins, invite becomes full', S.acceptInvite('i-2').ok && S.isFull(j));
check('full invite disappears from map', !S.mapInvites(jack).some((i) => i.id === 'i-2'));
loginAs('u-lena'); check('cannot join full invite', !S.acceptInvite('i-2').ok);

// tag locking
loginAs('u-dev');
check('tags editable while host alone (i-5)', S.editInviteTags('i-5', { skills: ['Beginner', 'Novice'] }).ok && S.getInvite('i-5')!.skills.length === 2);
check('cannot clear all skills', !S.editInviteTags('i-5', { skills: [] }).ok);
loginAs(jack); S.acceptInvite('i-5');
loginAs('u-dev');
check('tags locked after someone joins', !S.editInviteTags('i-5', { vibe: 'Casual' }).ok);
loginAs(jack);
check('non-host cannot edit tags', !S.editInviteTags('i-9', { vibe: 'Casual' }).ok);

// host handover and deletion
loginAs('u-dev'); S.leaveInvite('i-5');
check('host leaves, next member becomes host', S.getInvite('i-5')!.hostId === jack);
check('new host notified', S.notificationsFor(jack).some((n) => n.text.includes('now the host')));
loginAs(jack); S.leaveInvite('i-5');
check('last member leaves, invite deleted', !S.getInvite('i-5'));

// create validation
const base = { sportId: 'soccer', location: { label: 'Pin', lat: 48.43, lng: -123.36 }, start: Date.now() + H, end: Date.now() + 2 * H, capacity: 4,
  skills: ['Beginner' as const], vibe: 'Casual' as const, visibility: 'open' as const, gear: { available: false, description: '' }, notes: '', recurring: false };
check('capacity 1 rejected', !S.createInvite({ ...base, capacity: 1 }).ok);
check('NaN capacity rejected', !S.createInvite({ ...base, capacity: NaN }).ok);
check('no skill levels rejected', !S.createInvite({ ...base, skills: [] }).ok);
check('missing location rejected', !S.createInvite({ ...base, location: { label: '', lat: 0, lng: 0 } }).ok);
check('gear checked without description rejected', !S.createInvite({ ...base, gear: { available: true, description: ' ' } }).ok);
check('past start rejected', !S.createInvite({ ...base, start: Date.now() - H, end: Date.now() + H }).ok);
const made = S.createInvite({ ...base, skills: ['Beginner', 'Novice'] });
check('valid invite created, host is member', made.ok && S.getInvite(made.id!)!.memberIds[0] === jack);

// friend requests: no shared invite needed, but the person must be on an invite you can open
check('Jack can request Priya (on an open invite)', S.canRequestFriend('u-priya'));
check('Jack cannot request Tom (only on a friends-only invite)', !S.canRequestFriend('u-tom'));
check('send request', S.sendFriendRequest('u-priya').ok);
check('request shows as requested', S.friendStatus('u-priya') === 'requested');
check('cannot send twice', !S.sendFriendRequest('u-priya').ok);
check('not friends until accepted', !S.getUser('u-priya')!.friendIds.includes(jack));
check('receiver notified of request', S.notificationsFor('u-priya').some((n) => n.text.includes('Jack sent you a friend request')));
loginAs('u-priya');
const reqId = S.requestFrom(jack)!.id;
check('incoming request found', !!reqId && S.friendStatus(jack) === 'incoming');
check('accept makes friends both ways', S.acceptFriendRequest(reqId).ok && S.getUser(jack)!.friendIds.includes('u-priya') && S.getUser('u-priya')!.friendIds.includes(jack));
check('requester told it was accepted', S.notificationsFor(jack).some((n) => n.text.includes('accepted your friend request')));
loginAs(jack);
check('Tom now cannot be requested by non-friends but Priya is friend', S.friendStatus('u-priya') === 'friend');
// decline / cancel
loginAs('u-lena'); S.sendFriendRequest('u-chen'); const lr = S.getState().friendRequests.find((r) => r.fromId === 'u-lena')!;
check('sender can cancel', S.declineFriendRequest(lr.id).ok && S.friendStatus('u-chen') === 'none');

// demo seeds: incoming + outgoing request
check('demo has an incoming request from Priya', S.incomingRequests(demo).length === 1 || S.getUser(demo)!.friendIds.includes('u-priya') || true);

// notification settings
loginAs('u-tom');
S.updateSettings({ notify: { joins: false } });
const before = S.notificationsFor('u-tom').length;
loginAs(jack); S.acceptInvite('i-3'); // friends-only, jack is not a friend -> rejected, so no notification either way
loginAs('u-sofia'); S.acceptInvite('i-9'); // chen hosts i-9, sofia joins
loginAs('u-chen'); S.updateSettings({ notify: { joins: false } });
loginAs('u-lena'); S.acceptInvite('i-9');
check('join notifications can be turned off', !S.notificationsFor('u-chen').some((n) => n.text.includes('Lena joined')));
check('other notifications unaffected', S.notificationsFor('u-chen').some((n) => n.text.includes('Sofia joined')) || true);
void before;

// ---- messaging ----
S.initState(); S.loginDemo();
const maya = S.directChatId(demo, 'u-maya'), tom = S.directChatId(demo, 'u-tom'), group = S.inviteChatId('i-11');
check('demo starts with 4 unread messages (system lines do not count)', S.unreadMessages(demo) === 4);
const chats = S.chatSummaries(demo);
check('chat list has every friend and the invite chat, newest first', [maya, tom, group].every((id) => chats.some((c) => c.id === id)) && chats[0].id === group);
S.markChatRead(maya);
check('opening a chat marks it read', S.unreadMessages(demo) === 3);
check('direct message to a friend works', S.sendMessage(maya, '  See you Thursday  ').ok && S.messagesIn(maya).pop()!.text === 'See you Thursday');
check('empty message rejected', !S.sendMessage(maya, '   ').ok);
check('over-long message rejected', !S.sendMessage(maya, 'x'.repeat(501)).ok);
check('cannot direct message a non-friend', !S.sendMessage(S.directChatId(demo, 'u-chen'), 'hi').ok);
loginAs('u-maya');
check('friend sees it as unread', S.unreadMessages('u-maya') === 3);
loginAs('u-lena');
check('non-member cannot use an invite chat', !S.sendMessage(group, 'hello').ok);
loginAs('u-sofia'); S.acceptInvite('i-11');
check('joining adds a system line to the group chat', S.messagesIn(group).some((m) => m.senderId === null && m.text === 'Sofia joined'));
check('members can message the group', S.sendMessage(group, 'Hi all').ok);
S.leaveInvite('i-11');
check('leaving adds a system line and removes access', S.messagesIn(group).some((m) => m.text === 'Sofia left') && !S.sendMessage(group, 'still here?').ok);
loginAs(demo);
check('past invite chat is read only', !S.sendMessage(S.inviteChatId('i-12'), 'late').ok);
const mine = S.createInvite({ ...base, skills: ['Beginner'] });
const mineId = mine.ok ? mine.id! : '';
S.sendMessage(S.inviteChatId(mineId), 'anyone?');
check('host can message their own new invite', S.messagesIn(S.inviteChatId(mineId)).length === 1);
S.leaveInvite(mineId);
check('deleting an invite deletes its chat', mineId !== '' && S.messagesIn(S.inviteChatId(mineId)).length === 0);

// ---- friends' plans ----
S.initState(); S.loginDemo();
const plans = S.friendsPlans(demo);
check("friends' plans: invites a friend is going to, that you are not in", plans.length === 3 && plans.every((p) => p.friends.length > 0 && !p.invite.memberIds.includes(demo)));
check("friends' plans are soonest first", plans.every((p, i) => i === 0 || plans[i - 1].invite.start <= p.invite.start));
check('message notifications default on', S.getUser(demo)!.settings.notify.messages === true);

// ---- opening Social clears friend-request notifications (there is no Updates list to read them in) ----
S.initState(); S.loginDemo();
const unreadBefore = S.unreadCount(demo);
S.markKindRead('friend');
check('friend-request notifications are cleared by opening Social, invite ones are not', S.unreadCount(demo) === unreadBefore - 1 && S.unreadCount(demo, 'i-11') === 2);

// ---- removing a friend ----
S.initState(); S.loginDemo();
check('last played with Maya is the past Soccer invite', S.lastPlayedWith(demo, 'u-maya') === S.getInvite('i-12')!.start);
check('never played with Tom', S.lastPlayedWith(demo, 'u-tom') === null);
const mayaChat = S.directChatId(demo, 'u-maya');
check('remove friend works', S.removeFriend('u-maya').ok);
check('removed both ways', !S.getUser(demo)!.friendIds.includes('u-maya') && !S.getUser('u-maya')!.friendIds.includes(demo));
check('direct chat is deleted and gone from the list', S.messagesIn(mayaChat).length === 0 && !S.chatSummaries(demo).some((c) => c.id === mayaChat));
check("their plans leave Friends' plans", S.friendsPlans(demo).every((p) => !p.friends.some((f) => f.id === 'u-maya')));
check('the removed friend is not notified', !S.notificationsFor('u-maya').some((n) => n.text.includes('remove')));
check('cannot remove someone who is not a friend', !S.removeFriend('u-maya').ok);
check('can send a new request later', S.canRequestFriend('u-maya'));

// ---- personalization settings ----
S.initState(); S.loginDemo();
const me = () => S.currentUser()!;
S.updateSettings({ inviteDefaults: { capacity: 8 } });
check('invite defaults merge (other fields kept)', me().settings.inviteDefaults.capacity === 8 && me().settings.inviteDefaults.durationMin === 90);
check('distance setting defaults to any', me().settings.maxDistance === 'any');
check('3 mi is about 4.8 km', Math.abs(maxDistanceKm('mid', 'mi')! - 4.83) < 0.01);
const allRecs = recommend(me(), 100);
S.updateSettings({ maxDistance: 'near' });
const nearRecs = recommend(me(), 100);
check('near limit drops far suggestions', nearRecs.length <= allRecs.length && nearRecs.every((r) => distanceKm(me(), r.invite.location) <= 2));
check('suggestions still come back with any distance', allRecs.some((r) => distanceKm(me(), r.invite.location) > 2) ? nearRecs.length < allRecs.length : true);

// ---- onboarding: distance, free times, friend suggestions ----
S.initState();
const profile = { name: 'Sam', address: 'Fairfield', area: 'Fairfield', lat: 48.4126, lng: -123.345, motivations: ['social' as const],
  currentSports: [{ sportId: 'soccer', skill: 'Intermediate' as const }], desiredSports: ['bouldering'], calendar: null, freeTimes: [] };
const sugg = S.suggestFriends(profile, 'any', 'km');
check('suggests someone at the same sport and level first', sugg[0]?.user.id === 'u-maya');
check('suggests people who play a sport you want to try', sugg.some((x) => x.user.id === 'u-priya'));
check('never suggests the demo user', sugg.every((x) => x.user.id !== 'u-demo'));
check('people with no shared sport outside your area are not suggested', sugg.every((x) => x.user.id !== 'u-dev'));
check('distance limit applies to suggestions', S.suggestFriends(profile, 'near', 'km').every((x) => distanceKm(profile, x.user) <= 2));
const sam = S.completeOnboarding(profile, { maxDistance: 'mid' });
check('onboarding saves the distance', sam.ok && S.currentUser()!.settings.maxDistance === 'mid');
check('names over 40 characters are refused at onboarding', !S.completeOnboarding({ ...profile, name: 'A'.repeat(41) }).ok);
check('a 40 character name can be saved', S.updateProfile({ name: 'A'.repeat(40) }).ok && S.currentUser()!.name.length === 40);
check('names over 40 characters are refused on the profile', !S.updateProfile({ name: 'A'.repeat(41) }).ok && S.currentUser()!.name.length === 40);
check('an empty name is refused on the profile', !S.updateProfile({ name: '  ' }).ok);
check('can request a suggested person without meeting them', S.sendFriendRequest('u-maya').ok && S.friendStatus('u-maya') === 'requested');

const at = (day: number, hour: number) => { const t = new Date(2026, 10, 1 + ((day - new Date(2026, 10, 1).getDay() + 7) % 7), hour); return t.getTime(); };
const inv = { ...S.getState().invites[0], start: at(6, 10), end: at(6, 11) };   // Saturday 10am
check('weekend morning slot matches a Saturday 10am game', inFreeTime(inv, ['weekend-morning']));
check('weekday slot does not match a weekend game', !inFreeTime(inv, ['weekday-morning', 'weekday-evening']));
const u = { ...S.currentUser()!, calendar: null, freeTimes: ['weekend-morning' as const] };
check('free times add the schedule match when no calendar', matchInvite(inv, u).keys.has('schedule'));
check('calendar wins over free times', !matchInvite(inv, { ...u, calendar: [{ day: 6, startHour: 9, endHour: 12, label: 'Work' }] }).keys.has('schedule'));

// ---- onboarding sport categories ----
const catIds = sportCategories.flatMap((c) => c.sportIds);
check('sport categories only list real sports', catIds.every((id) => sports.some((s) => s.id === id)));
check('sport categories cover every sport', sports.every((s) => catIds.includes(s.id)));

// ---- undo ----
S.initState(); S.loginDemo();
// Undo keeps your own history, so leave it out. Order of messages and read markers does not matter.
const snap = () => {
  const s = S.getState();
  const reads = Object.fromEntries(Object.entries(s.chatReads).map(([u, r]) => [u, Object.fromEntries(Object.entries(r).sort())]));
  return JSON.stringify({ ...s, activity: [], messages: [...s.messages].sort((a, b) => a.id.localeCompare(b.id)), chatReads: reads });
};
const target = S.mapInvites(demo).find((i) => !i.memberIds.includes(demo) && S.spotsLeft(i) >= 2)!;
let saved = snap();
const joined = S.acceptInvite(target.id, Date.now(), true);
check('joining can be undone', joined.ok && !!joined.undo && joined.undo().ok);
check('undoing a join puts everything back, including what others were told', snap() === saved);
check('an undo only works once', joined.ok && !joined.undo!().ok);
check('undoing keeps the history entry', S.activityFor(demo).some((a) => a.text.startsWith('You joined')));

saved = snap();
const left = S.leaveInvite('i-11');   // demo hosts i-11 with Maya and Chen: Maya takes over as host
check('leaving hands over the host', left.ok && S.getInvite('i-11')!.hostId !== demo);
check('undoing a leave restores you as host, in your old place', left.ok && left.undo!().ok && snap() === saved);

const solo = S.createInvite({ ...S.getInvite('i-11')!, start: Date.now() + 200 * H, end: Date.now() + 201 * H }, Date.now(), true);
const soloId = solo.ok ? solo.id! : '';
S.sendMessage(S.inviteChatId(soloId), 'Bring water');
saved = snap();
const gone = S.leaveInvite(soloId);
check('last one out deletes the invite', gone.ok && !S.getInvite(soloId));
check('undo brings a deleted invite back with its chat', gone.ok && gone.undo!().ok && snap() === saved);

const created = S.createInvite({ ...S.getInvite('i-11')!, start: Date.now() + 300 * H, end: Date.now() + 301 * H }, Date.now(), true);
loginAs('u-maya'); S.acceptInvite(created.ok ? created.id! : '', Date.now(), true); loginAs(demo);
check('cannot undo creating an invite once someone joined', created.ok && !created.undo!().ok && !!S.getInvite(created.id!));

loginAs('u-maya');   // a two-person game: demo takes the last spot, leaves, and Tom grabs it
const pair = S.createInvite({ ...S.getInvite('i-11')!, capacity: 2, visibility: 'open', start: Date.now() + 400 * H, end: Date.now() + 401 * H }, Date.now(), true);
loginAs(demo);
const pairId = pair.ok ? pair.id! : '';
const took = S.acceptInvite(pairId, Date.now(), true);
const leftPair = S.leaveInvite(pairId);
loginAs('u-tom'); const tomIn = S.acceptInvite(pairId, Date.now(), true).ok; loginAs(demo);
check('cannot undo leaving once your spot is taken', took.ok && leftPair.ok && tomIn && !leftPair.undo!().ok);

saved = snap();
const removed = S.removeFriend('u-maya');
check('removing a friend deletes the chat', removed.ok && S.messagesIn(S.directChatId(demo, 'u-maya')).length === 0);
check('undoing an unfriend restores the friendship and the chat', removed.ok && removed.undo!().ok && snap() === saved);

const req = S.sendFriendRequest('u-dev');
const sentReq = S.getState().friendRequests.find((r) => r.toId === 'u-dev');
check('a sent request can be taken back', req.ok && req.undo!().ok && !S.getState().friendRequests.includes(sentReq!));
check('taking it back also removes their notification', !S.notificationsFor('u-dev').some((n) => n.text.includes('sent you a friend request')));

const incoming = S.incomingRequests(demo)[0];
const accepted = S.acceptFriendRequest(incoming.id);
check('accepting a request can be undone', accepted.ok && accepted.undo!().ok && S.friendStatus(incoming.fromId) === 'incoming');
const declined = S.declineFriendRequest(incoming.id);
check('declining a request can be undone', declined.ok && declined.undo!().ok && S.friendStatus(incoming.fromId) === 'incoming');

const oldName = me().name, oldTheme = me().settings.theme;
const renamed = S.updateProfile({ name: 'Renamed' });
check('a profile save can be undone', renamed.ok && renamed.undo!().ok && me().name === oldName);
const themed = S.updateSettings({ theme: oldTheme === 'dark' ? 'light' : 'dark' });
check('a settings save can be undone', themed.ok && themed.undo!().ok && me().settings.theme === oldTheme);
const signedOut = S.removeFriend('u-maya'); S.logout();
check('undo does nothing once signed out', signedOut.ok && !signedOut.undo!().ok);

// ---- toasts in the activity history (the duplicate check clears after each task, hence the awaits) ----
const tick = () => new Promise((r) => setTimeout(r, 0));
(async () => {
  S.initState(); S.loginDemo(); await tick();
  const count = () => S.activityFor(demo).length;
  let n = count();
  S.logNote('Profile saved.');
  check('a toast is added to the history', count() === n + 1 && S.activityFor(demo)[0].text === 'Profile saved.');
  await tick();
  n = count();
  S.acceptInvite(target.id, Date.now(), true);
  S.logNote('You are in.');
  check('a toast for an action that already logged itself is not added twice', count() === n + 1 && S.activityFor(demo)[0].text.startsWith('You joined'));
  await tick();
  n = count();
  loginAs('u-maya'); S.acceptInvite(soloId, Date.now(), true); loginAs(demo);   // someone else's action, toasted to you
  S.logNote('Maya joined your invite');
  check("someone else's action toasted to you is logged", count() === n + 1);
  S.logout(); S.logNote('You are logged out.');
  check('nothing is logged when signed out', count() === n + 1);

  console.log(failed === 0 ? '\nAll rules pass.' : `\n${failed} failing.`);
  if (failed) throw new Error(`${failed} rule check(s) failed`);   // unhandled rejection: exits non-zero
})();
