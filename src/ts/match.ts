// Recommendation scoring. Inputs: sport, skill level and schedule (plus friends, vibe, gear, area).
// Every score comes with the matching keys, so the UI can highlight the tags that match the user's profile.
import { getSport, getVenue, mapInvites } from './state';
import type { BusyBlock, Invite, Skill, User } from './types';

export type MatchKey = 'sport' | 'skill' | 'schedule' | 'vibe' | 'gear' | 'friends' | 'area';
export interface MatchResult { score: number; keys: Set<MatchKey>; skill?: Skill }

/** The calendar block (if any) that overlaps this invite. */
export function busyConflict(inv: Invite, calendar: BusyBlock[]): BusyBlock | null {
  const s = new Date(inv.start), e = new Date(inv.end);
  const from = s.getHours() + s.getMinutes() / 60;
  const to = e.toDateString() === s.toDateString() ? e.getHours() + e.getMinutes() / 60 : 24;
  return calendar.find((b) => b.day === s.getDay() && b.startHour < to && b.endHour > from) ?? null;
}

export function matchInvite(inv: Invite, user: User): MatchResult {
  const keys = new Set<MatchKey>();
  const sport = getSport(inv.sportId);
  const current = user.currentSports.find((s) => s.sportId === inv.sportId);
  const wanted = user.desiredSports.includes(inv.sportId);
  if (!sport || (!current && !wanted)) return { score: 0, keys };

  let score = 0;
  let matchedSkill: Skill | undefined;
  keys.add('sport');
  score += current ? 4 : 3;

  if (current && inv.skills.includes(current.skill)) { keys.add('skill'); score += 3; matchedSkill = current.skill; }
  else if (!current && (inv.skills.includes('Beginner') || inv.skills.includes('Novice'))) {
    keys.add('skill'); score += 3; matchedSkill = inv.skills.includes('Beginner') ? 'Beginner' : 'Novice';
  }

  if (user.calendar) {
    if (busyConflict(inv, user.calendar)) score -= 3;
    else { keys.add('schedule'); score += 2; }
  }

  if (inv.memberIds.some((id) => user.friendIds.includes(id))) { keys.add('friends'); score += 2; }

  const wantsCompete = user.motivations.some((m) => m === 'competition' || m === 'challenge');
  const wantsSocial = user.motivations.some((m) => m === 'social' || m === 'learn');
  if ((inv.vibe === 'Competitive' && wantsCompete) || (inv.vibe === 'Casual' && wantsSocial)) { keys.add('vibe'); score += 1; }

  if (inv.gear.available && wanted && !current) { keys.add('gear'); score += 1; }

  const venue = inv.location.venueId ? getVenue(inv.location.venueId) : undefined;
  if (venue && venue.area === user.area) { keys.add('area'); score += 1; }

  return { score, keys, skill: matchedSkill };
}

export interface Recommendation { invite: Invite; match: MatchResult }

/** Upcoming, visible, joinable invites that fit the user, best first. */
export function recommend(user: User, limit = 6): Recommendation[] {
  return mapInvites(user.id)
    .filter((i) => !i.memberIds.includes(user.id))
    .map((invite) => ({ invite, match: matchInvite(invite, user) }))
    .filter((r) => r.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score || a.invite.start - b.invite.start)
    .slice(0, limit);
}
