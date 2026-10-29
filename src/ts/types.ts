// Shared types for the whole app. No logic lives here.

export type Skill = 'Beginner' | 'Intermediate' | 'Advanced';
export type InviteSkill = Skill | 'All levels';
export type Vibe = 'Casual' | 'Competitive';
/** "open" = visible to everyone on the map, "friends" = host's friends only */
export type Visibility = 'open' | 'friends';
export type Motivation = 'exercise' | 'challenge' | 'competition' | 'social' | 'learn';

export interface SportSkill { sportId: string; skill: Skill }

/** Fake calendar: a recurring weekly busy block (day 0 = Sunday). */
export interface BusyBlock { day: number; startHour: number; endHour: number; label: string }

export interface User
{
  id: string;
  name: string;
  avatarColor: string;
  area: string;                 // neighbourhood, from onboarding
  motivations: Motivation[];
  currentSports: SportSkill[];
  desiredSports: string[];      // sport ids
  calendar: BusyBlock[] | null; // null = not synced (optional step)
  friendIds: string[];
}

export interface GearItem { item: string; required: boolean; note: string }

export interface Sport
{
  id: string;
  name: string;
  tagline: string;
  description: string;
  typicalGroup: string;
  soloFriendly: boolean;        // can be done individually, but invites still make it social
  motivations: Motivation[];
  gear: GearItem[];
  howToStart: string[];
}

export type VenueKind = 'gym' | 'park' | 'field' | 'court' | 'cages' | 'trail';

/** Preset venue. Map coordinates are percentages (0-100) of the stylized map. */
export interface Venue
{
  id: string;
  name: string;
  kind: VenueKind;
  area: string;
  x: number;
  y: number;
  hours: string;
  sportIds: string[];
  rentals: string[];            // what can be rented on site
  info: string;
}

export interface InviteLocation
{
  label: string;
  x: number;
  y: number;
  venueId?: string;             // absent = freeform pin
}

export interface Invite
{
  id: string;
  hostId: string;
  memberIds: string[];          // host included; memberIds[0] is always the host
  sportId: string;
  location: InviteLocation;
  start: number;                // epoch ms
  end: number;
  capacity: number;             // host included, minimum 2
  skill: InviteSkill;
  vibe: Vibe;
  visibility: Visibility;
  gear: { available: boolean; description: string };
  notes: string;
  recurring: boolean;           // weekly, for informal teams
}

export interface Notification
{
  id: string;
  userId: string;               // who receives it
  inviteId: string | null;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface ActivityItem { id: string; userId: string; text: string; at: number; inviteId: string | null }

export interface AppState
{
  currentUserId: string | null;
  users: Record<string, User>;
  invites: Invite[];
  notifications: Notification[];
  activity: ActivityItem[];
}

export type Result = { ok: true; id?: string } | { ok: false; error: string };

export type NewInviteInput = Omit<Invite, 'id' | 'hostId' | 'memberIds'>;
export type TagEdit = Partial<Pick<Invite, 'skill' | 'vibe' | 'visibility'>>;
