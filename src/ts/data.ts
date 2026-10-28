// Fake data for the prototype. Victoria, BC flavoured, but venues/hours/prices are invented.
import type { Invite, Sport, User, Venue } from './types';

const HOUR = 3_600_000;

export const venues: Venue[] = [
    {
        id: 'v-boulder', name: 'Boulder House', kind: 'gym', area: 'Downtown', x: 48, y: 52, hours: 'Daily 10am-10pm', sportIds: ['bouldering'],
        rentals: ['Climbing shoes', 'Chalk'], info: 'Indoor bouldering gym with beginner walls and an intro orientation.'
    },
    {
        id: 'v-beacon', name: 'Beacon Hill Park Fields', kind: 'field', area: 'James Bay', x: 42, y: 80, hours: 'Dawn to dusk', sportIds: ['soccer', 'running', 'baseball'],
        rentals: [], info: 'Large public grass fields. No lights, no bookings needed.'
    },
    {
        id: 'v-uvic', name: 'UVic Stadium Field', kind: 'field', area: 'Gordon Head', x: 80, y: 28, hours: 'Dawn to 9pm', sportIds: ['soccer', 'running'],
        rentals: [], info: 'Turf field with lights on weeknights. Check campus signage for bookings.'
    },
    {
        id: 'v-windsor', name: 'Windsor Park Courts', kind: 'court', area: 'Oak Bay', x: 88, y: 62, hours: 'Dawn to dusk', sportIds: ['tennis', 'basketball'],
        rentals: [], info: 'Two tennis courts and a half basketball court. First come, first served.'
    },
    {
        id: 'v-cages', name: 'Home Run Batting Cages', kind: 'cages', area: 'Saanich', x: 28, y: 38, hours: 'Mon-Fri 3-9pm, Sat-Sun 10am-8pm', sportIds: ['baseball'],
        rentals: ['Bats', 'Helmets', 'Gloves ($3)'], info: '6 cages, up to 2 people per cage. About $2 per 15 pitches.'
    },
    {
        id: 'v-goose', name: 'Galloping Goose Trailhead', kind: 'trail', area: 'Vic West', x: 20, y: 62, hours: 'Always open', sportIds: ['running', 'cycling'],
        rentals: [], info: 'Paved multi-use trail. Flat and good for all levels.'
    },
    {
        id: 'v-vicwest', name: 'Vic West Outdoor Court', kind: 'court', area: 'Vic West', x: 34, y: 50, hours: 'Dawn to dusk', sportIds: ['basketball'],
        rentals: [], info: 'Full-length outdoor court with two hoops.'
    },
];

export const sports: Sport[] = [
    {
        id: 'soccer', name: 'Soccer', tagline: 'Team sport, easy to start', typicalGroup: '6-22 players', soloFriendly: false, motivations: ['exercise', 'social', 'competition'],
        description: 'Two teams try to put the ball in the other goal. Pickup games are common and flexible about numbers.',
        gear: [{ item: 'Cleats or running shoes', required: true, note: 'Cleats help on grass, not required for casual games' },
        { item: 'Shin guards', required: false, note: 'Recommended for competitive games' },
        { item: 'Water bottle', required: true, note: 'Bring your own' }],
        howToStart: ['Join a Casual, Beginner-friendly invite', 'Show up 10 minutes early', 'Ask the host about team colours']
    },
    {
        id: 'bouldering', name: 'Bouldering', tagline: 'Solo sport, better with company', typicalGroup: '2-6 climbers', soloFriendly: true, motivations: ['exercise', 'challenge', 'learn'],
        description: 'Climbing short routes without ropes over padded floors. Everyone climbs at their own pace, so groups take turns and cheer each other on.',
        gear: [{ item: 'Climbing shoes', required: true, note: 'Rentable at most gyms' },
        { item: 'Chalk', required: false, note: 'Rentable or shareable' },
        { item: 'Comfortable clothes', required: true, note: 'Anything stretchy' }],
        howToStart: ['Do the gym orientation', 'Rent shoes first, buy later', 'Start on the easiest-graded problems']
    },
    {
        id: 'baseball', name: 'Baseball', tagline: 'Start small with batting and catch', typicalGroup: '2-18 players', soloFriendly: false, motivations: ['social', 'learn', 'exercise'],
        description: 'Bat-and-ball game. A full game needs many people, but a small group can do batting cages, catch, or pepper.',
        gear: [{ item: 'Glove', required: true, note: 'Fit matters more than brand. Often shareable' },
        { item: 'Bat', required: false, note: 'Cages provide rental bats' },
        { item: 'Helmet', required: false, note: 'Provided at batting cages' }],
        howToStart: ['Try a batting cage invite first', 'Borrow a glove before buying one', 'Work up to small-sided games']
    },
    {
        id: 'running', name: 'Running', tagline: 'Solo sport, social pace groups', typicalGroup: '2-10 runners', soloFriendly: true, motivations: ['exercise', 'challenge', 'social'],
        description: 'Group runs set a shared pace so nobody runs alone. Pick a distance and pace that suits you.',
        gear: [{ item: 'Running shoes', required: true, note: 'Any comfortable trainers' }, { item: 'Water', required: false, note: 'Recommended for runs over 5 km' }],
        howToStart: ['Choose a Casual run', 'Start with 3-5 km', 'Walk breaks are fine']
    },
    {
        id: 'cycling', name: 'Cycling', tagline: 'Solo sport, group rides', typicalGroup: '2-8 riders', soloFriendly: true, motivations: ['exercise', 'challenge', 'social'],
        description: 'Group rides on trails or roads at a pace the host announces.',
        gear: [{ item: 'Bike', required: true, note: 'Check the invite for borrowing options' }, { item: 'Helmet', required: true, note: 'Required by law in BC' }, { item: 'Lock', required: false, note: 'For café stops' }],
        howToStart: ['Pick a trail ride first', 'Check your tyres and brakes', 'Tell the host your comfortable pace']
    },
    {
        id: 'basketball', name: 'Basketball', tagline: 'Pickup games, small groups', typicalGroup: '4-10 players', soloFriendly: false, motivations: ['exercise', 'competition', 'social'],
        description: 'Half-court 3v3 or full-court 5v5 pickup games, usually self-organised.',
        gear: [{ item: 'Court shoes', required: true, note: 'Non-marking soles for indoor courts' }, { item: 'Basketball', required: false, note: 'Hosts often bring one' }],
        howToStart: ['Join a Casual run', 'Call next on the sideline', 'Learn the local rules (make-it-take-it?)']
    },
    {
        id: 'tennis', name: 'Tennis', tagline: 'Rallies with a partner', typicalGroup: '2-4 players', soloFriendly: false, motivations: ['exercise', 'competition', 'learn'],
        description: 'Singles or doubles on a hard court. Beginners can start with rallying.',
        gear: [{ item: 'Racket', required: true, note: 'Often shareable' }, { item: 'Tennis balls', required: true, note: 'Host usually brings a can' }],
        howToStart: ['Try a Beginner rally', 'Borrow a racket first', 'Learn basic scoring later']
    },
];

const palette = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#9b72cf', '#e56b9f', '#4aa3a2', '#c98b3b'];

export function seedUsers(): Record<string, User>
{
    const mk = (id: string, name: string, i: number, area: string, cur: [string, 'Beginner' | 'Intermediate' | 'Advanced'][], friends: string[]): User => ({
        id, name, avatarColor: palette[i % palette.length], area, motivations: ['exercise', 'social'],
        currentSports: cur.map(([sportId, skill]) => ({ sportId, skill })), desiredSports: [], calendar: null, friendIds: friends,
    });
    const list: User[] = [
        {
            id: 'u-demo', name: 'Alex (demo)', avatarColor: palette[1], area: 'Fairfield', motivations: ['exercise', 'social', 'learn'],
            currentSports: [{ sportId: 'soccer', skill: 'Intermediate' }, { sportId: 'bouldering', skill: 'Beginner' }],
            desiredSports: ['baseball', 'running'],
            calendar: [
                { day: 1, startHour: 9, endHour: 15, label: 'Classes' }, { day: 3, startHour: 9, endHour: 15, label: 'Classes' },
                { day: 5, startHour: 9, endHour: 17, label: 'Work' },
            ],
            friendIds: ['u-maya', 'u-tom'],
        },
        mk('u-maya', 'Maya', 0, 'James Bay', [['soccer', 'Intermediate']], ['u-demo']),
        mk('u-chen', 'Chen', 2, 'Gordon Head', [['soccer', 'Advanced']], []),
        mk('u-priya', 'Priya', 4, 'Downtown', [['bouldering', 'Intermediate']], []),
        mk('u-tom', 'Tom', 3, 'Saanich', [['baseball', 'Intermediate']], ['u-demo']),
        mk('u-lena', 'Lena', 5, 'Vic West', [['running', 'Advanced']], []),
        mk('u-omar', 'Omar', 6, 'Oak Bay', [['bouldering', 'Beginner'], ['tennis', 'Beginner']], []),
        mk('u-sofia', 'Sofia', 7, 'Saanich', [['baseball', 'Beginner'], ['running', 'Intermediate']], []),
        mk('u-dev', 'Dev', 1, 'Vic West', [['basketball', 'Intermediate']], []),
    ];
    return Object.fromEntries(list.map((u) => [u.id, u]));
}

/** Invites are generated relative to "now" so "tonight" and "tomorrow" always make sense. */
export function seedInvites(now: number): Invite[]
{
    const at = (h: number) => now + h * HOUR;
    const loc = (venueId: string) =>
    {
        const v = venues.find((x) => x.id === venueId)!;
        return { label: v.name, x: v.x, y: v.y, venueId };
    };
    const nogear = { available: false, description: '' };
    const base = { recurring: false, notes: '' };
    return [
        {
            ...base, id: 'i-1', hostId: 'u-chen', memberIds: ['u-chen', 'u-maya', 'u-priya', 'u-dev', 'u-lena', 'u-omar'], sportId: 'soccer', location: loc('v-uvic'),
            start: at(3), end: at(4.5), capacity: 14, skill: 'Intermediate', vibe: 'Casual', visibility: 'open',
            gear: { available: true, description: '2 spare pinnies and a ball' }, notes: 'Pickup 7v7, bring a dark and a light shirt.'
        },
        {
            ...base, id: 'i-2', hostId: 'u-priya', memberIds: ['u-priya', 'u-omar'], sportId: 'bouldering', location: loc('v-boulder'),
            start: at(5), end: at(7), capacity: 4, skill: 'Beginner', vibe: 'Casual', visibility: 'open',
            gear: { available: true, description: 'Chalk to share' }, notes: 'Happy to show newcomers the basics.'
        },
        {
            ...base, id: 'i-3', hostId: 'u-tom', memberIds: ['u-tom'], sportId: 'baseball', location: loc('v-cages'),
            start: at(26), end: at(27.5), capacity: 4, skill: 'Beginner', vibe: 'Casual', visibility: 'friends',
            gear: { available: true, description: 'One spare glove' }, notes: 'Friends warm-up session.'
        },
        {
            ...base, id: 'i-4', hostId: 'u-lena', memberIds: ['u-lena', 'u-sofia'], sportId: 'running', location: loc('v-goose'),
            start: at(18), end: at(19), capacity: 6, skill: 'All levels', vibe: 'Casual', visibility: 'open',
            gear: nogear, notes: '5 km easy pace, coffee after.'
        },
        {
            ...base, id: 'i-5', hostId: 'u-dev', memberIds: ['u-dev'], sportId: 'basketball', location: loc('v-vicwest'),
            start: at(8), end: at(9.5), capacity: 8, skill: 'Intermediate', vibe: 'Competitive', visibility: 'open',
            gear: { available: true, description: 'I bring a ball' }, notes: ''
        },
        {
            ...base, id: 'i-6', hostId: 'u-maya', memberIds: ['u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
            start: at(50), end: at(51.5), capacity: 12, skill: 'Intermediate', vibe: 'Competitive', visibility: 'open',
            gear: nogear, notes: 'Weekly informal team looking for new players. Everyone gets a tryout game.', recurring: true
        },
        // Full: must NOT appear on the map
        {
            ...base, id: 'i-7', hostId: 'u-sofia', memberIds: ['u-sofia', 'u-omar', 'u-dev', 'u-lena'], sportId: 'tennis', location: loc('v-windsor'),
            start: at(30), end: at(31.5), capacity: 4, skill: 'Beginner', vibe: 'Casual', visibility: 'open', gear: nogear, notes: 'Doubles.'
        },
        {
            ...base, id: 'i-8', hostId: 'u-omar', memberIds: ['u-omar'], sportId: 'cycling', location: loc('v-goose'),
            start: at(72), end: at(75), capacity: 6, skill: 'Advanced', vibe: 'Competitive', visibility: 'open', gear: nogear, notes: '40 km ride, brisk pace.'
        },
        {
            ...base, id: 'i-9', hostId: 'u-chen', memberIds: ['u-chen'], sportId: 'soccer', location: loc('v-beacon'),
            start: at(96), end: at(97.5), capacity: 10, skill: 'Beginner', vibe: 'Casual', visibility: 'open', gear: nogear, notes: 'First timers welcome.'
        },
        {
            ...base, id: 'i-10', hostId: 'u-sofia', memberIds: ['u-sofia', 'u-dev'], sportId: 'baseball', location: loc('v-cages'),
            start: at(28), end: at(29.5), capacity: 6, skill: 'Beginner', vibe: 'Casual', visibility: 'open',
            gear: { available: true, description: 'Gloves and a bat to share' }, notes: 'Learning together, no experience needed.'
        },
        // Alex's own upcoming invite (demo user hosts)
        {
            ...base, id: 'i-11', hostId: 'u-demo', memberIds: ['u-demo', 'u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
            start: at(20), end: at(21.5), capacity: 8, skill: 'Intermediate', vibe: 'Casual', visibility: 'open', gear: nogear, notes: ''
        },
        // Past invite (shows in Activity)
        {
            ...base, id: 'i-12', hostId: 'u-demo', memberIds: ['u-demo', 'u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
            start: at(-48), end: at(-46.5), capacity: 8, skill: 'Intermediate', vibe: 'Casual', visibility: 'open', gear: nogear, notes: ''
        },
    ];
}