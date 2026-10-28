// Quick checks of the invite rules. Run: npm test
import * as S from '../src/ts/state';

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
const newUser = S.completeOnboarding({ name: 'Jack', area: 'Gordon Head', motivations: ['social'], currentSports: [], desiredSports: ['soccer'], calendar: null });
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
check('tags editable while host alone (i-5)', S.editInviteTags('i-5', { skill: 'Beginner' }).ok && S.getInvite('i-5')!.skill === 'Beginner');
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
const base = {
    sportId: 'soccer', location: { label: 'Pin', x: 10, y: 10 }, start: Date.now() + H, end: Date.now() + 2 * H, capacity: 4,
    skill: 'Beginner' as const, vibe: 'Casual' as const, visibility: 'open' as const, gear: { available: false, description: '' }, notes: '', recurring: false
};
check('capacity 1 rejected', !S.createInvite({ ...base, capacity: 1 }).ok);
check('missing location rejected', !S.createInvite({ ...base, location: { label: '', x: 0, y: 0 } }).ok);
check('gear checked without description rejected', !S.createInvite({ ...base, gear: { available: true, description: ' ' } }).ok);
check('past start rejected', !S.createInvite({ ...base, start: Date.now() - H, end: Date.now() + H }).ok);
const made = S.createInvite(base);
check('valid invite created, host is member', made.ok && S.getInvite(made.id!)!.memberIds[0] === jack);

// friends
check('cannot add stranger', !S.addFriend('u-tom').ok);
check('can add someone from a shared meetup', S.canAddFriend('u-priya') && S.addFriend('u-priya').ok);
check('friendship is mutual', S.getUser('u-priya')!.friendIds.includes(jack));

console.log(failed === 0 ? '\nAll rules pass.' : `\n${failed} failing.`);
if (failed) throw new Error(`${failed} rule check(s) failed`); // non-zero exit when run with node