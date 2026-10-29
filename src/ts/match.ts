// Recommendation scoring. Inputs: sport, skill level and schedule (plus friends, vibe, gear, area).
// Every score comes with the reasons, so the UI can highlight matching tags and explain "why".
import { getUser, getVenue, getSport, mapInvites } from './state';
import type { BusyBlock, Invite, User } from './types';

export type MatchKey = 'sport' | 'skill' | 'schedule' | 'vibe' | 'gear' | 'friends' | 'area';
export interface MatchResult { score: number; keys: Set<MatchKey>; why: string }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayPart = (hour: number) => (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening');

/** The calendar block (if any) that overlaps this invite. */
export function busyConflict(inv: Invite, calendar: BusyBlock[]): BusyBlock | null
{
  const s = new Date(inv.start), e = new Date(inv.end);
  const from = s.getHours() + s.getMinutes() / 60;
  const to = e.toDateString() === s.toDateString() ? e.getHours() + e.getMinutes() / 60 : 24;
  return calendar.find((b) => b.day === s.getDay() && b.startHour < to && b.endHour > from) ?? null;
}

export function matchInvite(inv: Invite, user: User): MatchResult
{
  const keys = new Set<MatchKey>();
  const sport = getSport(inv.sportId);
  const current = user.currentSports.find((s) => s.sportId === inv.sportId);
  const wanted = user.desiredSports.includes(inv.sportId);
  if (!sport || (!current && !wanted)) return { score: 0, keys, why: '' };

  let score = 0;
  const bits: string[] = [];
  keys.add('sport');
  score += current ? 4 : 3;
  bits.push(current ? `you play ${sport.name}` : `${sport.name} is on your want-to-try list`);

  if (inv.skill === 'All levels') { keys.add('skill'); score += 2; bits.push('all levels are welcome'); }
  else if (current && current.skill === inv.skill) { keys.add('skill'); score += 3; bits.push(`${inv.skill} level, like you`); }
  else if (!current && inv.skill === 'Beginner') { keys.add('skill'); score += 3; bits.push('beginner friendly'); }

  if (user.calendar)
  {
    const conflict = busyConflict(inv, user.calendar);
    if (conflict) score -= 3;
    else
    {
      keys.add('schedule'); score += 2;
      const d = new Date(inv.start);
      bits.push(`you're free ${DAYS[d.getDay()]} ${dayPart(d.getHours())}`);
    }
  }

  const friends = inv.memberIds.filter((id) => user.friendIds.includes(id)).map((id) => getUser(id)!.name);
  if (friends.length)
  {
    keys.add('friends'); score += 2;
    bits.push(friends.length === 1 ? `${friends[0]} is going` : `${friends[0]} and ${friends.length - 1} more friend${friends.length > 2 ? 's are' : ' is'} going`);
  }

  const wantsCompete = user.motivations.some((m) => m === 'competition' || m === 'challenge');
  const wantsSocial = user.motivations.some((m) => m === 'social' || m === 'learn');
  if ((inv.vibe === 'Competitive' && wantsCompete) || (inv.vibe === 'Casual' && wantsSocial)) { keys.add('vibe'); score += 1; }

  if (inv.gear.available && wanted && !current) { keys.add('gear'); score += 1; bits.push('gear is shared, so you can start without your own'); }

  const venue = inv.location.venueId ? getVenue(inv.location.venueId) : undefined;
  if (venue && venue.area === user.area) { keys.add('area'); score += 1; bits.push(`it's in ${user.area}`); }

  const sentence = bits.length > 1 ? `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}` : bits[0];
  return { score, keys, why: sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.' };
}

export interface Recommendation { invite: Invite; match: MatchResult }

/** Upcoming, visible, joinable invites that fit the user, best first. */
export function recommend(user: User, limit = 6): Recommendation[]
{
  return mapInvites(user.id)
    .filter((i) => !i.memberIds.includes(user.id))
    .map((invite) => ({ invite, match: matchInvite(invite, user) }))
    .filter((r) => r.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score || a.invite.start - b.invite.start)
    .slice(0, limit);
}
