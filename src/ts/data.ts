// Fake data for the prototype. Real Greater Victoria geography, but people, invites, hours and several
// venue names are invented, and venue coordinates are approximate.
import type { BusyBlock, FreeTime, Invite, LatLng, Motivation, Settings, Skill, Sport, User, Venue } from './types';

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

export const defaultSettings = (): Settings => ({
  theme: 'system', units: 'km', maxDistance: 'any', mapStart: 'last', timeFormat: '12h', weekStart: 1,
  inviteDefaults: { sportId: null, capacity: 4, durationMin: 90, vibe: 'Casual', visibility: 'open' },
  notify: { joins: true, leaves: true, friends: true, messages: true, friendInvites: true },
});

export const venues: Venue[] = [
  { id: 'v-boulder', name: 'Boulder House', kind: 'gym', area: 'Downtown', lat: 48.4310, lng: -123.3660, hours: 'Daily 10am-10pm', sportIds: ['bouldering'],
    rentals: ['Climbing shoes', 'Chalk'], info: 'Indoor bouldering gym with beginner walls and an intro orientation.' },
  { id: 'v-beacon', name: 'Beacon Hill Park Fields', kind: 'field', area: 'James Bay', lat: 48.4128, lng: -123.3600, hours: 'Dawn to dusk', sportIds: ['soccer', 'running', 'baseball', 'cricket'],
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
  { id: 'v-fence', name: 'Victoria Fencing Club', kind: 'gym', area: 'James Bay', lat: 48.4235, lng: -123.3690, hours: 'Tue and Thu 7-9pm, Sat 10am-12pm', sportIds: ['fencing'],
    rentals: ['Mask, jacket and foil (beginner kit)'], info: 'A small club hall with a few pistes. Beginners are lent a full kit.' },
  { id: 'v-golf', name: 'Lakeside Pitch & Putt', kind: 'course', area: 'Saanich', lat: 48.4720, lng: -123.3600, hours: 'Daily 8am-dusk', sportIds: ['golf'],
    rentals: ['Clubs ($10)', 'Balls'], info: 'A short 9-hole course and driving range. Good for learning the basics.' },
  { id: 'v-volley', name: 'Willows Beach Courts', kind: 'court', area: 'Oak Bay', lat: 48.4380, lng: -123.2980, hours: 'Dawn to dusk', sportIds: ['volleyball'],
    rentals: [], info: 'Sand courts by the water. Bring your own ball if the host has not.' },
  { id: 'v-badminton', name: 'Gordon Head Racquet Hall', kind: 'gym', area: 'Gordon Head', lat: 48.4560, lng: -123.3260, hours: 'Daily 8am-10pm', sportIds: ['badminton'],
    rentals: ['Rackets ($4)', 'Shuttlecocks'], info: 'Indoor hall with six badminton courts. Book by the hour at the desk.' },
  { id: 'v-pool', name: 'Harbour Aquatic Centre', kind: 'pool', area: 'Downtown', lat: 48.4262, lng: -123.3610, hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm', sportIds: ['swimming'],
    rentals: ['Kickboards', 'Pull buoys'], info: '25 m lap pool with lanes by speed. Swim caps are required.' },
  { id: 'v-douglas', name: 'Mount Douglas Trailhead', kind: 'trail', area: 'Gordon Head', lat: 48.4905, lng: -123.3441, hours: 'Dawn to dusk', sportIds: ['hiking'],
    rentals: [], info: 'Well-marked trails to the summit. About 45 minutes up for most people.' },
  { id: 'v-yoga', name: 'Fairfield Community Studio', kind: 'gym', area: 'Fairfield', lat: 48.4135, lng: -123.3440, hours: 'Daily 7am-9pm', sportIds: ['yoga'],
    rentals: ['Mats ($2)', 'Blocks'], info: 'A quiet studio with mats and props provided.' },
];

export const sports: Sport[] = [
  { id: 'soccer', name: 'Soccer', aliases: ['football', 'futbol', 'footy'], tagline: 'Team sport, easy to start', typicalGroup: '6-22 players', soloFriendly: false, motivations: ['exercise', 'social', 'competition'],
    description: 'Two teams try to put the ball in the other goal. Pickup games are common and flexible about numbers.',
    gear: [{ item: 'Cleats or running shoes', required: true, note: 'Cleats help on grass, not required for casual games' },
      { item: 'Shin guards', required: false, note: 'Recommended for competitive games' }] },
  { id: 'bouldering', name: 'Bouldering', aliases: ['climbing', 'rock climbing', 'indoor climbing', 'boulder', 'climb'], tagline: 'Solo sport, better with company', typicalGroup: '2-6 climbers', soloFriendly: true, motivations: ['exercise', 'challenge', 'learn'],
    description: 'Climbing short routes without ropes over padded floors. Everyone climbs at their own pace, so groups take turns and cheer each other on.',
    gear: [{ item: 'Climbing shoes', required: true, note: 'Rentable at most gyms' }, { item: 'Chalk', required: false, note: 'Rentable or shareable' }] },
  { id: 'baseball', name: 'Baseball', aliases: ['softball', 'batting', 'hardball'], tagline: 'Start small with batting and catch', typicalGroup: '2-18 players', soloFriendly: false, motivations: ['social', 'learn', 'exercise'],
    description: 'Bat-and-ball game. A full game needs many people, but a small group can do batting cages, catch, or pepper.',
    gear: [{ item: 'Glove', required: true, note: 'Fit matters more than brand. Often shareable' },
      { item: 'Bat', required: false, note: 'Cages provide rental bats' }, { item: 'Helmet', required: false, note: 'Provided at batting cages' }] },
  { id: 'running', name: 'Running', aliases: ['jogging', 'jog', 'run', 'trail running', 'track', 'marathon'], tagline: 'Solo sport, social pace groups', typicalGroup: '2-10 runners', soloFriendly: true, motivations: ['exercise', 'challenge', 'social'],
    description: 'Group runs set a shared pace so nobody runs alone. Pick a distance and pace that suits you.',
    gear: [{ item: 'Running shoes', required: true, note: 'Any comfortable trainers' }] },
  { id: 'cycling', name: 'Cycling', aliases: ['biking', 'bike', 'bicycling', 'bicycle', 'cyclist', 'road cycling', 'mountain biking'], tagline: 'Solo sport, group rides', typicalGroup: '2-8 riders', soloFriendly: true, motivations: ['exercise', 'challenge', 'social'],
    description: 'Group rides on trails or roads at a pace the host announces.',
    gear: [{ item: 'Bike', required: true, note: 'Check the invite for borrowing options' }, { item: 'Helmet', required: true, note: 'Required by law in BC' }] },
  { id: 'basketball', name: 'Basketball', aliases: ['hoops', 'bball'], tagline: 'Pickup games, small groups', typicalGroup: '4-10 players', soloFriendly: false, motivations: ['exercise', 'competition', 'social'],
    description: 'Half-court 3v3 or full-court 5v5 pickup games, usually self-organised.',
    gear: [{ item: 'Court shoes', required: true, note: 'Non-marking soles for indoor courts' }, { item: 'Basketball', required: false, note: 'Hosts often bring one' }] },
  { id: 'tennis', name: 'Tennis', aliases: ['racquet', 'racket'], tagline: 'Rallies with a partner', typicalGroup: '2-4 players', soloFriendly: false, motivations: ['exercise', 'competition', 'learn'],
    description: 'Singles or doubles on a hard court. Beginners can start with rallying.',
    gear: [{ item: 'Racket', required: true, note: 'Often shareable' }, { item: 'Tennis balls', required: true, note: 'Host usually brings a can' }] },
  { id: 'fencing', name: 'Fencing', aliases: ['swordplay', 'epee', 'foil', 'sabre', 'saber', 'sword'], tagline: 'Duelling with a safe point', typicalGroup: '2-12 fencers', soloFriendly: false, motivations: ['challenge', 'competition', 'learn'],
    description: 'A fast, tactical sport with blunted swords. Clubs run beginner sessions and lend you everything you need.',
    gear: [{ item: 'Mask', required: true, note: 'Clubs lend beginner kit' },
      { item: 'Jacket', required: true, note: 'Clubs lend beginner kit' },
      { item: 'Glove', required: true, note: 'Clubs lend beginner kit' },
      { item: 'Own foil, epee or sabre', required: false, note: 'Not needed to start' }] },
  { id: 'golf', name: 'Golf', aliases: ['golfing', 'driving range', 'putting', 'pitch and putt', 'links'], tagline: 'Slow, sociable and outdoors', typicalGroup: '2-4 golfers', soloFriendly: true, motivations: ['social', 'challenge', 'learn'],
    description: 'Hit a ball round a course in as few strokes as you can. A short pitch-and-putt course is a gentle way to start.',
    gear: [{ item: 'Clubs', required: true, note: 'Rentable at most courses' }, { item: 'Golf shoes', required: false, note: 'Flat sneakers are fine on short courses' }] },
  { id: 'volleyball', name: 'Volleyball', aliases: ['beach volleyball', 'volley', 'spike'], tagline: 'Team sport on sand or indoors', typicalGroup: '6-12 players', soloFriendly: false, motivations: ['exercise', 'social', 'competition'],
    description: 'Two teams hit a ball over a net. Pickup games rotate players so everyone gets time on court.',
    gear: [{ item: 'Volleyball', required: false, note: 'Hosts usually bring one' }, { item: 'Knee pads', required: false, note: 'Useful for indoor games' }] },
  { id: 'badminton', name: 'Badminton', aliases: ['shuttlecock', 'birdie', 'racquet', 'racket'], tagline: 'Quick rallies with a partner', typicalGroup: '2-4 players', soloFriendly: false, motivations: ['exercise', 'competition', 'social'],
    description: 'Singles or doubles with a feathered shuttlecock. Easy to learn and a great workout.',
    gear: [{ item: 'Racket', required: true, note: 'Rentable at the hall' }, { item: 'Indoor shoes', required: true, note: 'Non-marking soles' }] },
  { id: 'swimming', name: 'Swimming', aliases: ['swim', 'laps', 'pool', 'aquatics'], tagline: 'Lane swimming with company', typicalGroup: '2-6 swimmers', soloFriendly: true, motivations: ['exercise', 'challenge'],
    description: 'Group lane sessions keep you motivated. Choose a lane that matches your speed.',
    gear: [{ item: 'Goggles', required: true, note: 'Bring your own' }, { item: 'Swim cap', required: true, note: 'Required at many pools' }] },
  { id: 'hiking', name: 'Hiking', aliases: ['walking', 'trekking', 'trail', 'hike'], tagline: 'Trails with a group', typicalGroup: '3-10 hikers', soloFriendly: true, motivations: ['exercise', 'social', 'challenge'],
    description: 'A group walk on trails at a pace the host announces. Great for meeting people while you get outside.',
    gear: [{ item: 'Sturdy shoes', required: true, note: 'Trails can be rooty and wet' }, { item: 'Rain jacket', required: false, note: 'Coastal weather changes fast' }] },
  { id: 'yoga', name: 'Yoga', aliases: ['stretching', 'pilates', 'mindfulness'], tagline: 'Gentle, in a group', typicalGroup: '4-15 people', soloFriendly: true, motivations: ['exercise', 'learn'],
    description: 'A relaxed group class or practice. Everyone works at their own level.',
    gear: [{ item: 'Yoga mat', required: true, note: 'Rentable or shareable' }] },
  { id: 'cricket', name: 'Cricket', aliases: ['wicket', 'bowling', 'batting'], tagline: 'Bat and ball, relaxed pace', typicalGroup: '6-22 players', soloFriendly: false, motivations: ['social', 'learn', 'competition'],
    description: 'A bat-and-ball team game. Informal games on the park pitch welcome newcomers and teach you as you play.',
    gear: [{ item: 'Bat', required: false, note: 'Clubs share spare gear' },
      { item: 'Pads', required: false, note: 'Clubs share spare gear' },
      { item: 'Protective gear', required: false, note: 'Needed for hard-ball matches' }] },
];

export const motivationOptions: { id: Motivation; label: string; hint: string }[] = [
  { id: 'exercise', label: 'Exercise', hint: 'Stay active' },
  { id: 'challenge', label: 'Challenge', hint: 'Push myself' },
  { id: 'competition', label: 'Competition', hint: 'Play to win' },
  { id: 'social', label: 'Social', hint: 'Meet people' },
  { id: 'learn', label: 'Learn', hint: 'Try something new' },
];

/** Free-time chips. Hours are [from, to) by start time of the invite. */
export const freeTimeOptions: { id: FreeTime; weekend: boolean; label: string; from: number; to: number }[] = [
  { id: 'weekday-morning', weekend: false, label: 'Mornings', from: 6, to: 12 },
  { id: 'weekday-afternoon', weekend: false, label: 'Afternoons', from: 12, to: 17 },
  { id: 'weekday-evening', weekend: false, label: 'Evenings', from: 17, to: 24 },
  { id: 'weekend-morning', weekend: true, label: 'Mornings', from: 6, to: 12 },
  { id: 'weekend-afternoon', weekend: true, label: 'Afternoons', from: 12, to: 17 },
  { id: 'weekend-evening', weekend: true, label: 'Evenings', from: 17, to: 24 },
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
      currentSports: cur.map(([sportId, skill]) => ({ sportId, skill })), desiredSports: [], calendar: null, freeTimes: [], friendIds: friends, settings: defaultSettings() };
  };
  const demoAddress = '1250 Fairfield Rd, Victoria';
  const g = geocode(demoAddress);
  const list: User[] = [
    { id: 'u-demo', name: 'Alex (demo)', avatarColor: palette[1], address: demoAddress, area: g.area, lat: g.lat, lng: g.lng, motivations: ['exercise', 'social', 'learn'],
      currentSports: [{ sportId: 'soccer', skill: 'Intermediate' }, { sportId: 'bouldering', skill: 'Beginner' }], desiredSports: ['baseball', 'running'],
      calendar: [{ day: 1, startHour: 9, endHour: 15, label: 'Classes' }, { day: 3, startHour: 9, endHour: 15, label: 'Classes' }, { day: 5, startHour: 9, endHour: 17, label: 'Work' }],
      freeTimes: [], friendIds: ['u-maya', 'u-tom'], settings: defaultSettings() },
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
    { ...base, id: 'i-13', hostId: 'u-chen', memberIds: ['u-chen'], sportId: 'golf', location: loc('v-golf'),
      start: at(44), end: at(47), capacity: 4, skills: ['Beginner', 'Novice'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'Spare clubs for one person' }, notes: 'Nine holes, no rush.' },
    { ...base, id: 'i-14', hostId: 'u-priya', memberIds: ['u-priya', 'u-omar'], sportId: 'fencing', location: loc('v-fence'),
      start: at(52), end: at(54), capacity: 6, skills: ['Beginner'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'The club lends beginner kit' }, notes: 'Intro session, all gear provided.' },
    { ...base, id: 'i-15', hostId: 'u-lena', memberIds: ['u-lena', 'u-dev', 'u-sofia'], sportId: 'volleyball', location: loc('v-volley'),
      start: at(27), end: at(28.5), capacity: 12, skills: ['Beginner', 'Novice', 'Intermediate'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'Ball and a portable net' }, notes: '' },
    { ...base, id: 'i-16', hostId: 'u-dev', memberIds: ['u-dev', 'u-omar'], sportId: 'badminton', location: loc('v-badminton'),
      start: at(9), end: at(10), capacity: 4, skills: ['Novice', 'Intermediate'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'Two spare rackets' }, notes: 'Doubles.' },
    { ...base, id: 'i-17', hostId: 'u-sofia', memberIds: ['u-sofia'], sportId: 'swimming', location: loc('v-pool'),
      start: at(14), end: at(15), capacity: 6, skills: ['Intermediate', 'Advanced'], vibe: 'Competitive', visibility: 'open', gear: nogear, notes: 'Steady lane session.' },
    { ...base, id: 'i-18', hostId: 'u-omar', memberIds: ['u-omar', 'u-lena'], sportId: 'hiking', location: loc('v-douglas'),
      start: at(74), end: at(77), capacity: 8, skills: [...SKILLS], vibe: 'Casual', visibility: 'open', gear: nogear, notes: 'Up and back, coffee after.' },
    { ...base, id: 'i-19', hostId: 'u-priya', memberIds: ['u-priya'], sportId: 'yoga', location: loc('v-yoga'),
      start: at(6), end: at(7), capacity: 10, skills: ['Beginner', 'Novice'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'Mats to borrow' }, notes: '' },
    { ...base, id: 'i-20', hostId: 'u-chen', memberIds: ['u-chen'], sportId: 'cricket', location: loc('v-beacon'),
      start: at(100), end: at(104), capacity: 14, skills: ['Beginner', 'Novice'], vibe: 'Casual', visibility: 'open',
      gear: { available: true, description: 'A few spare bats and pads' }, notes: 'Learning game, newcomers welcome.' },
    // Alex's own upcoming invite (demo user hosts)
    { ...base, id: 'i-11', hostId: 'u-demo', memberIds: ['u-demo', 'u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
      start: at(20), end: at(21.5), capacity: 8, skills: ['Intermediate'], vibe: 'Casual', visibility: 'open', gear: nogear, notes: '' },
    // Past invite (shows in Activity)
    { ...base, id: 'i-12', hostId: 'u-demo', memberIds: ['u-demo', 'u-maya', 'u-chen'], sportId: 'soccer', location: loc('v-beacon'),
      start: at(-48), end: at(-46.5), capacity: 8, skills: ['Intermediate'], vibe: 'Casual', visibility: 'open', gear: nogear, notes: '' },
  ];
}

/** Does the search text match this sport? Looks at the name and other names people use ("biking" finds Cycling). */
export function sportMatches(s: Sport, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const names = [s.name, ...s.aliases].map((n) => n.toLowerCase());
  return names.some((n) => n.includes(q)) || names.some((n) => n.length >= 4 && q.includes(n));   // "mountain biking" still finds Cycling
}
