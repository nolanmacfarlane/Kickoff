// Shared types for the whole app. No logic lives here.

export type Skill = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced';
export type Vibe = 'Casual' | 'Competitive';
/** "open" = visible to everyone on the map, "friends" = host's friends only */
export type Visibility = 'open' | 'friends';
export type Motivation = 'exercise' | 'challenge' | 'competition' | 'social' | 'learn';

export interface LatLng { lat: number; lng: number }
export interface SportSkill { sportId: string; skill: Skill }

/** Fake calendar: a recurring weekly busy block (day 0 = Sunday). */
export interface BusyBlock { day: number; startHour: number; endHour: number; label: string }

export interface Settings {
  theme: 'light' | 'dark';
  units: 'km' | 'mi';
  notify: { joins: boolean; leaves: boolean; friends: boolean; messages: boolean };
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  address: string;              // what the user typed in onboarding
  area: string;                 // neighbourhood found from the address (fake lookup)
  lat: number;                  // "you are here" on the map
  lng: number;
  motivations: Motivation[];
  currentSports: SportSkill[];
  desiredSports: string[];      // sport ids
  calendar: BusyBlock[] | null; // null = not synced (optional step)
  friendIds: string[];
  settings: Settings;
}

export interface GearItem { item: string; required: boolean; note: string }

export interface Sport {
  id: string;
  name: string;
  tagline: string;
  description: string;
  typicalGroup: string;
  soloFriendly: boolean;        // can be done individually, but invites still make it social
  motivations: Motivation[];
  gear: GearItem[];             // only gear a newcomer would not assume
}

export type VenueKind = 'gym' | 'park' | 'field' | 'court' | 'cages' | 'trail';

export interface Venue extends LatLng {
  id: string;
  name: string;
  kind: VenueKind;
  area: string;
  hours: string;
  sportIds: string[];
  rentals: string[];            // what can be rented on site
  info: string;
}

export interface InviteLocation extends LatLng {
  label: string;
  venueId?: string;             // absent = freeform pin
}

export interface Invite {
  id: string;
  hostId: string;
  memberIds: string[];          // host included; memberIds[0] is always the host
  sportId: string;
  location: InviteLocation;
  start: number;                // epoch ms
  end: number;
  capacity: number;             // host included, minimum 2
  skills: Skill[];              // one or more levels welcome; all four = "All levels"
  vibe: Vibe;
  visibility: Visibility;
  gear: { available: boolean; description: string };
  notes: string;
  recurring: boolean;           // weekly, for informal teams
}

export type NotificationKind = 'join' | 'leave' | 'friend' | 'other';

export interface Notification {
  id: string;
  userId: string;               // who receives it
  inviteId: string | null;
  kind: NotificationKind;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface FriendRequest { id: string; fromId: string; toId: string; createdAt: number }
export type FriendStatus = 'self' | 'friend' | 'requested' | 'incoming' | 'none';

/** Chats: direct messages between friends, and one group chat per meetup. senderId null = a system line ("Maya joined"). */
export interface Message { id: string; chatId: string; senderId: string | null; text: string; at: number }
export interface ChatSummary { id: string; kind: 'direct' | 'meetup'; inviteId?: string; friendId?: string; last?: Message; unread: number; readOnly: boolean }

export interface ActivityItem { id: string; userId: string; text: string; at: number; inviteId: string | null }

export interface AppState {
  currentUserId: string | null;
  users: Record<string, User>;
  invites: Invite[];
  notifications: Notification[];
  activity: ActivityItem[];
  friendRequests: FriendRequest[];
  messages: Message[];
  chatReads: Record<string, Record<string, number>>;   // userId -> chatId -> time last read
}

export type Result = { ok: true; id?: string } | { ok: false; error: string };

export type NewInviteInput = Omit<Invite, 'id' | 'hostId' | 'memberIds'>;
export type TagEdit = Partial<Pick<Invite, 'skills' | 'vibe' | 'visibility'>>;
export type SettingsPatch = Partial<Omit<Settings, 'notify'>> & { notify?: Partial<Settings['notify']> };
