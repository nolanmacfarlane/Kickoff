// Invites at the same place (usually the same venue) share ONE pin with a count, so none are hidden underneath.
import { matchInvite } from '../match';
import { getSport } from '../state';
import type { Invite, User } from '../types';
import type { MapPin } from './mapWidget';

export interface PinGroup { key: string; label: string; lat: number; lng: number; invites: Invite[] }

/** Same venue, or the same spot to about 10 metres for custom pins. */
export const groupKey = (i: Invite): string => i.location.venueId ?? `${i.location.lat.toFixed(4)},${i.location.lng.toFixed(4)}`;

export function groupInvites(list: Invite[]): PinGroup[]
{
    const groups = new Map<string, PinGroup>();
    for (const i of list)
    {
        const key = groupKey(i);
        const g = groups.get(key);
        if (g) g.invites.push(i);
        else groups.set(key, { key, label: i.location.label, lat: i.location.lat, lng: i.location.lng, invites: [i] });
    }
    return [...groups.values()];
}

export function groupPins(groups: PinGroup[], user: User): MapPin[]
{
    return groups.map((g) =>
    {
        const n = g.invites.length;
        const sport = getSport(g.invites[0].sportId)!.name;
        const matches = g.invites.some((i) => matchInvite(i, user).keys.has('sport'));
        const allFriends = g.invites.every((i) => i.visibility === 'friends');
        return {
            id: g.key, lat: g.lat, lng: g.lng, count: n,
            glyph: n > 1 ? String(n) : sport.charAt(0),
            label: n > 1 ? `${n} invites at ${g.label}` : `${sport} at ${g.label}`,
            variant: matches ? 'match' : allFriends ? 'friends' : undefined,
        } as MapPin;
    });
}