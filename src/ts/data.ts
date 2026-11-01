// Fake data for the prototype. Real Greater Victoria geography, but people, invites, hours and several
// venue names are invented, and venue coordinates are approximate.
import type { BusyBlock, Invite, LatLng, Motivation, Settings, Skill, Sport, User, Venue } from './types';

const HOUR = 3_600_000;

export const SKILLS: Skill[] = ['Beginner', 'Novice', 'Intermediate', 'Advanced'];

export const areas = ['Downtown', 'James Bay', 'Fairfield', 'Vic West', 'Saanich', 'Oak Bay', 'Gordon Head'];
export const areaCenters: Record<string, LatLng> = {
  Downtown: { lat: 48.4284, lng: -123.3656 }, 'James Bay': { lat: 48.4132, lng: -123.3705 },
  Fairfield: { lat: 48.4126, lng: -123.3450 }, 'Vic West': { lat: 48.4310, lng: -123.3880 },
  Saanich: { lat: 48.4600, lng: -123.3700 }, 'Oak Bay': { lat: 48.4290, lng: -123.3000 },
  'Gordon Head': { lat: 48.4620, lng: -123.3200 },
};

/** Fake address lookup: finds a known neighbourhood in the text (default Downtown) and nudges the point a little. */
export function geocode(address: string): { area: string; lat: number; lng: number } {
  const text = address.toLowerCase();
  const area = areas.find((a) => text.includes(a.toLowerCase())) ?? 'Downtown';
  const c = areaCenters[area];
  const hash = [...text].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 10007, 7);
  return { area, lat: c.lat + ((hash % 100) / 100 - 0.5) * 0.006, lng: c.lng + ((Math.floor(hash / 100) % 100) / 100 - 0.5) * 0.006 };
}

export const defaultSettings = (): Settings => ({ theme: 'light', units: 'km', notify: { joins: true, leaves: true, friends: true, messages: true } });

export const venues: Venue[] = [
  { id: 'v-boulder', name: 'Boulder House', kind: 'gym', area: 'Downtown', lat: 48.4310, lng: -123.3660, hours: 'Daily 10am-10pm', sportIds: ['bouldering'],
    rentals: ['Climbing shoes', 'Chalk'], info: 'Indoor bouldering gym with beginner walls and an intro orientation.' },
  { id: 'v-beacon', name: 'Beacon Hill Park Fields', kind: 'field', area: 'James Bay', lat: 48.4128, lng: -123.3600, hours: 'Dawn to dusk', sportIds: ['soccer', 'running', 'baseball'],
    rentals: [], info: 'Large public grass fields. No lights, no bookings needed.' },
  { id: 'v-uvic', name: 'UVic Stadium Field', kind: 'field', area: 'Gordon Head', lat: 48.4637, lng: -123.3110, hours: 'Dawn to 9pm', sportIds: ['soccer', 'running'],
    rentals: [], info: 'Turf field with lights on weeknights. Check campus signage for bookings.' },
  { id: 'v-windsor', name: 'Windsor Park Courts', kind: 'court', area: 'Oak Bay', lat: 48.4330, lng: -123.3030, hours: 'Dawn to dusk', sportIds: ['tennis', 'basketball'],
    rentals: [], info: 'Two tennis courts and a half basketball court. First come, first served.' },
  { id: 'v-cages', name: 'Home Run Batting Cages', kind: 'cages', area: 'Saanich', lat: 48.4600, lng: -123.3800, hours: 'Mon-Fri 3-9pm, Sat-Sun 10am-8pm', sportIds: ['baseball'],
    rentals: ['Bats', 'Helmets', 'Gloves ($3)'], info: '6 cages, up to 2 people per cage. About $2 per 15 pitches.' },
  { id: 'v-goose', name: 'Galloping Goose Trailhead', kind: 'trail', area: 'Vic West', lat: 48.4300, lng: -123.3850, hours: 'Always open', sportIds: ['running', 'cycling'],
    rentals: [], info: 'Paved multi-use trail. Flat and good for all levels.' },
  { id: 'v-vicwest', name: 'Vic West Outdoor Court', kind: 'court', area: 'Vic West', lat: 48.4345, lng: -123.3800, hours: 'Dawn to dusk', sportIds: ['basketball'],
    rentals: [], info: 'Full-length outdoor court with two hoops.' },
];

export const sports: Sport[] = [
  { id: 'soccer', name: 'Soccer', tagline: 'Team sport, easy to start', typicalGroup: '6-22 players', soloFriendly: false, motivations: ['exercise', 'social', 'competition'],
    description: 'Two teams try to put the ball in the other goal. Pickup games are common and flexible about numbers.',
    gear: [{ item: 'Cleats or running shoes', required: true, note: 'Cleats help on grass, not required for casual games' },
      { item: 'Shin guards', required: false, note: 'Recommended for competitive games' }] },
  { id: 'bouldering', name: 'Bouldering', tagline: 'Solo sport, better with company', typicalGroup: '2-6 climbers', soloFriendly: true, motivations: ['exercise', 'challenge', 'learn'],
    description: 'Climbing short routes without ropes over padded floors. Everyone climbs at their own pace, so groups take turns and cheer each other on.',
    gear: [{ item: 'Climbing shoes', required: true, note: 'Rentable at most gyms' }, { item: 'Chalk', required: false, note: 'Rentable or shareable' }] },
  { id: 'baseball', name: 'Baseball', tagline: 'Start small with batting and catch', typicalGroup: '2-18 players', soloFriendly: false, motivations: ['social', 'learn', 'exercise'],
    description: 'Bat-and-ball game. A full game needs many people, but a small group can do batting cages, catch, or pepper.',
    gear: [{ item: 'Glove', required: true, note: 'Fit matters more than brand. Often shareable' },
      { item: 'Bat', required: false, note: 'Cages provide rental bats' }, { item: 'Helmet', required: false, note: 'Provided at batting cages' }] },
  { id: 'running', name: 'Running', tagline: 'Solo sport, social pace groups', typicalGroup: '2-10 runners', soloFriendly: true, motivations: ['exercise', 'challenge', 'social'],
    description: 'Group runs set a shared pace so nobody runs alone. Pick a distance and pace that suits you.',
    gear: [{ item: 'Running shoes', required: true, note: 'Any comfortable trainers' }] },
  { id: 'cycling', name: 'Cycling', tagline: 'Solo sport, group rides', typicalGroup: '2-8 riders', soloFriendly: true, motivations: ['exercise', 'challenge', 'social'],
    description: 'Group rides on trails or roads at a pace the host announces.',
    gear: [{ item: 'Bike', required: true, note: 'Check the invite for borrowing options' }, { item: 'Helmet', required: true, note: 'Required by law in BC' }] },
  { id: 'basketball', name: 'Basketball', tagline: 'Pickup games, small groups', typicalGroup: '4-10 players', soloFriendly: false, motivations: ['exercise', 'competition', 'social'],
    description: 'Half-court 3v3 or full-court 5v5 pickup games, usually self-organised.',
    gear: [{ item: 'Court shoes', required: true, note: 'Non-marking soles for indoor courts' }, { item: 'Basketball', required: false, note: 'Hosts often bring one' }] },
  { id: 'tennis', name: 'Tennis', tagline: 'Rallies with a partner', typicalGroup: '2-4 players', soloFriendly: false, motivations: ['exercise', 'competition', 'learn'],
    description: 'Singles or doubles on a hard court. Beginners can start with rallying.',
    gear: [{ item: 'Racket', required: true, note: 'Often shareable' }, { item: 'Tennis balls', required: true, note: 'Host usually brings a can' }] },
];

export const motivationOptions: { id: Motivation; label: string; hint: string }[] = [
  { id: 'exercise', label: 'Exercise', hint: 'Stay active' },
  { id: 'challenge', label: 'Challenge', hint: 'Push myself' },
  { id: 'competition', label: 'Competition', hint: 'Play to win' },
  { id: 'social', label: 'Social', hint: 'Meet people' },
  { id: 'learn', label: 'Learn', hint: 'Try something new' },
];

/** What "sync my calendar" fills in. Fake, weekly, day 0 = Sunday. */
export const sampleCalendar: BusyBlock[] = [
  { day: 1, startHour: 9, endHour: 15, label: 'Classes' }, { day: 2, startHour: 12, endHour: 16, label: 'Work' },
  { day: 3, startHour: 9, endHour: 15, label: 'Classes' }, { day: 4, startHour: 12, endHour: 16, label: 'Work' },
  { day: 5, startHour: 9, endHour: 17, label: 'Work' },
];

const palette = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#9b72cf', '#e56b9f', '#4aa3a2', '#c98b3b'];

export function seedUsers(): Record<string, User> {
  const mk = (id: string, name: string, i: number, area: string, cur: [string, Skill][], friends: string[]): User => {
    const c = areaCenters[area];
    return { id, name, avatarColor: palette[i % palette.length], address: `${area}, Victoria`, area, lat: c.lat, lng: c.lng, motivations: ['exercise', 'social'],
      currentSports: cur.map(([sportId, skill]) => ({ sportId, skill })), desiredSports: [], calendar: null, friendIds: friends, settings: defaultSettings() };
  };
  const demoAddress = '1250 Fairfield Rd, Victoria';
  const g = geocode(demoAddress);
  const list: User[] = [
    { id: 'u-demo', name: 'Alex (demo)', avatarColor: palette[1], address: demoAddress, area: g.area, lat: g.lat, lng: g.lng, motivations: ['exercise', 'social', 'learn'],
      currentSports: [{ sportId: 'soccer', skill: 'Intermediate' }, { sportId: 'bouldering', skill: 'Beginner' }], desiredSports: ['baseball', 'running'],
      calendar: [{ day: 1, startHour: 9, endHour: 15, label: 'Classes' }, { day: 3, startHour: 9, endHour: 15, label: 'Classes' }, { day: 5, startHour: 9, endHour: 17, label: 'Work' }],
      friendIds: ['u-maya', 'u-tom'], settings: defaultSettings() },
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
export function seedInvites(now: number): Invite[] {
  const at = (h: number) => now + h * HOUR;
  const loc = (venueId: string) => { const v = venues.find((x) => x.id === venueId)!; return { label: v.name, lat: v.lat, lng: v.lng, venueId }; };
  const nogear = { available: false, description: '' };
  const base = { recurring: false, notes: '' };
  return [
    { ...base, id: 'i-1', hostId: 'u-chen', memberIds: ['u-chen', 'u-maya', 'u-priya', 'u-dev', 'u-lena', 'u-omar'], sportId: 'soccer', location: loc('v-uvic'),
      start: at(3), end: at(4.5), capacity: 14, skills: ['Intermediate'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: '2 spare pinnies and a ball' }, notes: 'Pickup 7v7, bring a dark and a light shirt.' },
    { ...base, id: 'i-2', hostId: 'u-priya', memberIds: ['u-priya', 'u-omar'], sportId: 'bouldering', location: loc('v-boulder'),
      start: at(5), end: at(7), capacity: 4, skills: ['Beginner', 'Novice'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'Chalk to share' }, notes: 'Happy to show newcomers the basics.' },
    { ...base, id: 'i-3', hostId: 'u-tom', memberIds: ['u-tom'], sportId: 'baseball', location: loc('v-cages'),
      start: at(26), end: at(27.5), capacity: 4, skills: ['Beginner'], vibe: 'Casual', visibility: 'friends',
      gear: { available: true, description: 'One spare glove' }, notes: 'Friends warm-up session.' },
    { ...base, id: 'i-4', hostId: 'u-lena', memberIds: ['u-lena', 'u-sofia'], sportId: 'running', location: loc('v-goose'),
      start: at(18), end: at(19), capacity: 6, skills: [...SKILLS], vibe: 'Casual', visibility: 'open', gear: nogear, notes: '5 km easy pace, coffee after.' },
    { ...base, id: 'i-5', hostId: 'u-dev', memberIds: ['u-dev'], sportId: 'basketball', location: loc('v-vicwest'),
      start: at(8), end: at(9.5), capacity: 8, skills: ['Intermediate'], vibe: 'Competitive', visibility: 'open', gear: { available: true, description: 'I bring a ball' }, notes: '' },
    { ...base, id: 'i-6', hostId: 'u-maya', memberIds: ['u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
      start: at(50), end: at(51.5), capacity: 12, skills: ['Intermediate', 'Advanced'], vibe: 'Competitive', visibility: 'open',
      gear: nogear, notes: 'Weekly informal team looking for new players. Everyone gets a tryout game.', recurring: true },
    // Full: must NOT appear on the map
    { ...base, id: 'i-7', hostId: 'u-sofia', memberIds: ['u-sofia', 'u-omar', 'u-dev', 'u-lena'], sportId: 'tennis', location: loc('v-windsor'),
      start: at(30), end: at(31.5), capacity: 4, skills: ['Beginner'], vibe: 'Casual', visibility: 'open', gear: nogear, notes: 'Doubles.' },
    { ...base, id: 'i-8', hostId: 'u-omar', memberIds: ['u-omar'], sportId: 'cycling', location: loc('v-goose'),
      start: at(72), end: at(75), capacity: 6, skills: ['Advanced'], vibe: 'Competitive', visibility: 'open', gear: nogear, notes: '40 km ride, brisk pace.' },
    { ...base, id: 'i-9', hostId: 'u-chen', memberIds: ['u-chen'], sportId: 'soccer', location: loc('v-beacon'),
      start: at(96), end: at(97.5), capacity: 10, skills: ['Beginner', 'Novice'], vibe: 'Casual', visibility: 'open', gear: nogear, notes: 'First timers welcome.' },
    { ...base, id: 'i-10', hostId: 'u-sofia', memberIds: ['u-sofia', 'u-dev'], sportId: 'baseball', location: loc('v-cages'),
      start: at(28), end: at(29.5), capacity: 6, skills: ['Beginner'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'Gloves and a bat to share' }, notes: 'Learning together, no experience needed.' },
    // Alex's own upcoming invite (demo user hosts)
    { ...base, id: 'i-11', hostId: 'u-demo', memberIds: ['u-demo', 'u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
      start: at(20), end: at(21.5), capacity: 8, skills: ['Intermediate'], vibe: 'Casual', visibility: 'open', gear: nogear, notes: '' },
    // Past invite (shows in Activity)
    { ...base, id: 'i-12', hostId: 'u-demo', memberIds: ['u-demo', 'u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
      start: at(-48), end: at(-46.5), capacity: 8, skills: ['Intermediate'], vibe: 'Casual', visibility: 'open', gear: nogear, notes: '' },
  ];
}
