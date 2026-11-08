// Profile tab: menu on the left (as in the sketch), section on the right. All onboarding answers are edited in "Your profile".
import { inviteCard } from '../components/inviteCard';
import {
  calendarField, draftFromUser, draftToProfile, identityFields, motivationField, pendingSports, sportsField, type ProfileDraft,
} from '../components/profileFields';
import { saveBar, unsavedMark, watchEdits } from '../components/saveBar';
import { seg } from '../components/seg';
import { sportIcon } from '../components/sportBits';
import { sports } from '../data';
import { DISTANCES, distanceLabel } from '../geo';
import { avatar, confirmDialog, fmtAgo, go, h, keepFocus, toast } from '../dom';
import { getGuard, setGuard } from '../nav';
import type { ActivityItem, MaxDistance, Settings, Vibe, Visibility } from '../types';
import { activityFor, currentUser, logout, MAX_CAPACITY, MIN_CAPACITY, myPast, myUpcoming, updateProfile, updateSettings } from '../state';
import { openInvite } from './inviteDetail';
import { openSportInfo } from './sportInfo';

const SECTIONS: [string, string][] = [['profile', 'Your profile'], ['activity', 'Activity'], ['personalization', 'Personalization'], ['help', 'Help'], ['about', 'About us']];

// The name sits beside the avatar in a 156px slot and must fit the 88px header, so longer names get a smaller size and wrap.
// perLine = characters that fit on one line at that size (measured with the heading font), lines = how many fit in the header.
const NAME_SIZES = [
  { cls: '', perLine: 10, lines: 1 },                     // 1.9rem, e.g. "Jordan Lee" (two lines would not fit with the invite count)
  { cls: 'profile-name--md', perLine: 12, lines: 2 },     // 1.45rem, e.g. "Christopher Johnson"
  { cls: 'profile-name--sm', perLine: 14, lines: 3 },     // 1.15rem, e.g. "Mohammed Abdulrahman Al-Mubarak"
];

/** Lines the name wraps to with perLine characters per line, breaking at spaces and after hyphens like the browser does. */
function nameLines(name: string, perLine: number): number {
  let lines = 1, used = 0;
  for (const word of name.trim().split(/\s+|(?<=-)/)) {
    if (word.length > perLine) return Infinity;                            // would split mid-word, so try a smaller size
    if (used && used + 1 + word.length > perLine) { lines++; used = word.length; } else used += (used ? 1 : 0) + word.length;
  }
  return lines;
}

/** The largest size the name fits at without breaking a word. Names past every step use 1rem, which fits 40 characters in three lines. */
const nameSizeClass = (name: string) => (NAME_SIZES.find((s) => nameLines(name, s.perLine) <= s.lines)?.cls ?? 'profile-name--xs');

// The unsaved draft lives here so a re-render does not throw away what the user typed.
let editing: { userId: string; initial: string; draft: ProfileDraft } | null = null;

function profileEditor(): HTMLElement {
  const me = currentUser()!;
  if (!editing || editing.userId !== me.id) { const d = draftFromUser(me); editing = { userId: me.id, initial: JSON.stringify(d), draft: d }; }
  const ed = editing;
  const d = ed.draft;
  const root = h('div', {});
  const dirty = () => JSON.stringify(d) !== ed.initial;
  const fail = (msg: string) => { bar.setError(msg); return false; };

  function save(): boolean {
    if (!d.name.trim()) return fail('Add your name.');
    if (!d.address.trim()) return fail('Add your address.');
    if (d.motivations.length === 0) return fail('Pick at least one thing you are looking for.');
    if (pendingSports(d).length) return fail(`Choose a level for ${pendingSports(d).join(', ')}, or remove it.`);
    editing = null; setGuard(null);              // clear first: updateProfile triggers a re-render
    const res = updateProfile(draftToProfile(d));
    if (!res.ok) { editing = ed; return fail(res.error); }
    toast('Profile saved. Your suggestions are updated.', { undo: res.undo });
    return true;
  }
  const bar = saveBar({ section: 'profile', isDirty: dirty, onSave: save,
    onDiscard: () => { editing = null; page.replaceWith(profileEditor()); toast('Changes discarded.', { undo: restoreDraft('profile', () => { editing = ed; }, profileEditor) }); } });
  setGuard({ isDirty: dirty, save, discard: () => { editing = null; } });

  function draw(): void {
    keepFocus(() => root.replaceChildren(h('div', { class: 'stack' },
      h('section', { class: 'card stack' }, h('h2', {}, 'About you'), identityFields(d), motivationField(d, draw)),
      h('section', { class: 'card stack' }, h('h2', {}, 'Sports'), sportsField(d, draw, openSportInfo)),
      h('section', { class: 'card stack' }, h('h2', {}, 'Schedule'), calendarField(d, draw, me.settings.weekStart)))));
    bar.refresh();
  }
  const page = h('div', { class: 'editor', dataset: { section: 'profile' } }, root, bar.el);
  watchEdits(root, bar.refresh);
  draw();
  return page;
}

/** Undo for "Changes discarded": puts the draft back, and redraws that editor if it is on screen. */
function restoreDraft(section: string, restore: () => void, rebuild: () => HTMLElement): () => { ok: true } {
  return () => { restore(); document.querySelector(`.editor[data-section="${section}"]`)?.replaceWith(rebuild()); return { ok: true }; };
}

// Same pattern as the profile editor: changes go into a draft and only apply when saved.
let settingsEdit: { userId: string; initial: string; draft: Settings } | null = null;

function personalization(): HTMLElement {
  const me = currentUser()!;
  if (!settingsEdit || settingsEdit.userId !== me.id) {
    const d: Settings = structuredClone(me.settings);
    settingsEdit = { userId: me.id, initial: JSON.stringify(d), draft: d };
  }
  const ed = settingsEdit;
  const s = ed.draft;
  const root = h('div', {});
  const dirty = () => JSON.stringify(s) !== ed.initial;

  function save(): boolean {
    const cap = s.inviteDefaults.capacity;
    if (!Number.isInteger(cap) || cap < MIN_CAPACITY || cap > MAX_CAPACITY) { bar.setError(`Group size must be a whole number from ${MIN_CAPACITY} to ${MAX_CAPACITY}.`); return false; }
    settingsEdit = null; setGuard(null);         // clear first: updateSettings triggers a re-render
    const res = updateSettings(s);
    if (!res.ok) { settingsEdit = ed; bar.setError(res.error); return false; }
    toast('Personalization saved.', { undo: res.undo });
    return true;
  }
  const bar = saveBar({ section: 'personalization', isDirty: dirty, onSave: save,
    onDiscard: () => { settingsEdit = null; page.replaceWith(personalization()); toast('Changes discarded.', { undo: restoreDraft('personalization', () => { settingsEdit = ed; }, personalization) }); } });
  setGuard({ isDirty: dirty, save, discard: () => { settingsEdit = null; } });

  /** Change the draft and redraw (hints depend on the chosen values). */
  const set = (fn: () => void) => () => { fn(); draw(); };
  const toggle = (key: keyof Settings['notify'], label: string, hint: string) =>
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.notify[key], dataset: { key: `notify-${key}` }, onChange: (e: Event) => { s.notify[key] = (e.target as HTMLInputElement).checked; } }),
      h('span', { class: 'check__text' }, label, h('small', {}, hint)));
  const field = (label: string, control: Node, hint?: string) =>
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, label), control, hint ? h('span', { class: 'field__hint' }, hint) : null);
  const select = (key: string, label: string, value: string, opts: [string, string][], onPick: (v: string) => void) =>
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, label),
      h('select', { class: 'select', value, dataset: { key }, onChange: (e: Event) => onPick((e.target as HTMLSelectElement).value) },
        opts.map(([v, l]) => h('option', { value: v }, l))));
  const mine = me.currentSports.map((x) => x.sportId);
  const sportOpts: [string, string][] = [['', 'My first sport'],
    ...[...sports].sort((a, b) => Number(mine.includes(b.id)) - Number(mine.includes(a.id))).map((x): [string, string] => [x.id, x.name])];   // your sports first
  const mapStartHint: Record<Settings['mapStart'], string> = {
    last: 'Picks up where you last panned and zoomed.', home: 'Always starts centred on your address.', invites: 'Zooms to fit every invite that passes your filters.' };

  function draw(): void {
    const def = s.inviteDefaults;
    keepFocus(() => root.replaceChildren(h('div', { class: 'stack' },
      h('section', { class: 'card stack' }, h('h2', {}, 'Appearance'),
        field('Theme', seg('theme', [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], s.theme, (v) => set(() => { s.theme = v; })()))),
      h('section', { class: 'card stack' }, h('h2', {}, 'Date and time'),
        field('Time format', seg('time-format', [{ value: '12h', label: '12-hour (3:00 PM)' }, { value: '24h', label: '24-hour (15:00)' }], s.timeFormat, (v) => set(() => { s.timeFormat = v; })())),
        field('Week starts on', seg<'0' | '1'>('week-start', [{ value: '0', label: 'Sunday' }, { value: '1', label: 'Monday' }], String(s.weekStart) as '0' | '1', (v) => set(() => { s.weekStart = v === '0' ? 0 : 1; })()),
          'Used by your schedule and the "This week" map filter.')),
      h('section', { class: 'card stack' }, h('h2', {}, 'Distance and map'),
        field('Show distances in', seg('units', [{ value: 'km', label: 'Kilometres' }, { value: 'mi', label: 'Miles' }], s.units, (v) => set(() => { s.units = v; })())),
        field('Show invites within', seg<MaxDistance>('max-distance', (['near', 'mid', 'far', 'any'] as MaxDistance[]).map((d) => ({ value: d, label: d === 'any' ? 'Any distance' : `${DISTANCES[s.units][d]} ${s.units}` })), s.maxDistance, (v) => set(() => { s.maxDistance = v; })()),
          s.maxDistance === 'any' ? 'Suggestions and the map include every invite in the area.' : `Suggestions on Home and the Map list only include invites ${distanceLabel(s.maxDistance, s.units).toLowerCase()} of your address. You can change it for a moment with the map's Distance filter.`),
        field('Map opens at', seg<Settings['mapStart']>('map-start', [{ value: 'last', label: 'Where I left it' }, { value: 'home', label: 'My area' }, { value: 'invites', label: 'All invites' }], s.mapStart, (v) => set(() => { s.mapStart = v; })()),
          mapStartHint[s.mapStart])),
      h('section', { class: 'card stack' }, h('h2', {}, 'New invites'),
        h('p', { class: 'field__hint' }, 'The Create form starts with these. You can still change anything on each invite.'),
        select('def-sport', 'Sport', def.sportId ?? '', sportOpts, (v) => { def.sportId = v || null; }),
        select('def-length', 'Length', String(def.durationMin), [['60', '1 hour'], ['90', '1.5 hours'], ['120', '2 hours'], ['180', '3 hours']], (v) => { def.durationMin = Number(v); }),
        h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Group size, including you'),
          h('input', { class: 'input input--narrow', type: 'number', min: MIN_CAPACITY, max: MAX_CAPACITY, value: Number.isNaN(def.capacity) ? '' : String(def.capacity), dataset: { key: 'def-capacity' },
            onInput: (e: Event) => { def.capacity = parseInt((e.target as HTMLInputElement).value, 10); } })),
        field('Vibe', seg<Vibe>('def-vibe', [{ value: 'Casual', label: 'Casual' }, { value: 'Competitive', label: 'Competitive' }], def.vibe, (v) => set(() => { def.vibe = v; })())),
        field('Who can see it', seg<Visibility>('def-vis', [{ value: 'open', label: 'Open to everyone' }, { value: 'friends', label: 'Friends only' }], def.visibility, (v) => set(() => { def.visibility = v; })()))),
      h('section', { class: 'card stack' }, h('h2', {}, 'Notifications'),
        toggle('joins', 'Someone joins my invite', 'Includes when an invite fills up.'),
        toggle('leaves', 'Someone leaves my invite', 'Changes apply straight away.'),
        toggle('friends', 'Friend requests', 'New requests and when yours is accepted.'),
        toggle('friendInvites', 'Friends create an invite', 'When a friend starts an invite you can see.'),
        toggle('messages', 'New messages', 'Counts unread chats in the Social tab badge.')))));
    bar.refresh();
  }
  const page = h('div', { class: 'editor', dataset: { section: 'personalization' } }, root, bar.el);
  watchEdits(root, bar.refresh);
  draw();
  return page;
}

const FAQS: [string, string][] = [
  ['How do I find a game?', 'Open Home or Map. Games that match your sports, skill level and schedule have yellow tags and a line explaining why.'],
  ['How do I start my own game?', 'Use Create invite. Sport, place, time, number of people and at least one skill level are required. Everything else is optional.'],
  ['What do the pin colours mean?', 'Yellow pins match your profile (your sports and level). Dark pins are other invites, and teal pins are friends-only invites. A number means several invites at the same place. Click it to see them all.'],
  ['I do not own any gear. Can I still play?', 'Yes. Look for the green "Gear shared" tag, or tap the (?) next to a sport name to see what you need and where to borrow it.'],
  ['What does "Friends only" mean?', 'Only the host\'s friends can see and join the invite on the map. Everyone else will not see it.'],
  ['How do I add a friend?', 'Open an invite, find someone in the list of who is going, and tap Add friend. They need to accept before you are friends. You do not have to be part of the invite.'],
  ['Can I change my invite after people join?', 'The skill levels, vibe and who can see it can be changed only until someone joins. After that they are locked. You can still leave, and the next person becomes host.'],
];

function help(): HTMLElement {
  const byName = [...sports].sort((a, b) => a.name.localeCompare(b.name));
  return h('div', { class: 'stack' },
    h('section', { class: 'card stack' }, h('h2', {}, 'Frequently asked questions'),
      h('div', { class: 'faq-list' }, FAQS.map(([q, a]) => h('details', { class: 'faq' }, h('summary', {}, q), h('p', {}, a)))),
      h('div', {}, h('button', { class: 'btn btn--secondary', type: 'button' }, 'Contact support'))),   // intentionally does nothing
    h('section', { class: 'card stack' },
      h('div', {}, h('h2', {}, 'Sports info'), h('p', { class: 'muted' }, 'Tap a sport to see what you need and where to borrow gear.')),
      h('ul', { class: 'sport-grid' }, byName.map((s) => h('li', {},
        h('button', { class: 'sport-tile', type: 'button', 'aria-label': `About ${s.name}`, onClick: () => openSportInfo(s.id) },
          sportIcon(s.id, 'sport-icon sport-icon--tile'), h('span', {}, s.name)))))));
}

// Downloads the user's activity log as a Markdown file, newest entry first (same order as on screen).
function exportHistory(name: string, log: ActivityItem[]): void {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const md = [
    `# Kickoff activity history: ${name}`, '',
    `Exported ${stamp(Date.now())} · ${log.length} entr${log.length === 1 ? 'y' : 'ies'}`, '',
    '| When | Activity |', '| --- | --- |',
    ...log.map((a) => `| ${stamp(a.at)} | ${a.text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')} |`), '',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
  const today = new Date();
  const link = h('a', { href: url, download: `kickoff-history-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}.md` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  toast('History exported.');
}

export function render(args: string[]): HTMLElement {
  const me = currentUser()!;
  const section = SECTIONS.some(([id]) => id === args[0]) ? args[0] : 'profile';
  const count = myUpcoming(me.id).length + myPast(me.id).length;

  let content: HTMLElement;
  if (section === 'profile') content = profileEditor();
  else if (section === 'personalization') content = personalization();
  else if (section === 'help') content = help();
  else if (section === 'activity') {
    const up = myUpcoming(me.id), past = myPast(me.id), log = activityFor(me.id);
    content = h('div', { class: 'stack' },
      h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Upcoming')), up.length ? h('div', { class: 'card-list' }, up.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id), onAbout: () => openSportInfo(i.sportId) }))) : h('div', { class: 'empty empty--tight' }, 'Nothing planned.')),
      h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Past invites')), past.length ? h('div', { class: 'card-list' }, past.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id), onAbout: () => openSportInfo(i.sportId) }))) : h('div', { class: 'empty empty--tight' }, 'No past invites yet.')),
      h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'History')), log.length ? h('ul', { class: 'card activity-list' }, log.map((a) => h('li', {}, h('span', {}, a.text), h('time', {}, fmtAgo(a.at))))) : h('div', { class: 'empty empty--tight' }, 'No activity yet.'),
        log.length ? h('div', { class: 'activity-export' }, h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => exportHistory(me.name, log) }, 'Export history')) : null));
  } else content = h('div', { class: 'card stack' }, h('h2', {}, 'About us'), h('p', {}, 'Kickoff helps people play sports together on short notice, or plan ahead. This is a course prototype with made-up data.'),
    h('p', { class: 'muted' }, 'Sport icons by Phosphor Icons (MIT licence). Map data from OpenStreetMap contributors, map tiles by CARTO, map library Leaflet.'));

  const askLogout = () => confirmDialog({
    title: 'Log out?', body: 'You will go back to the welcome screen.',
    actions: [{ label: 'Stay logged in' }, { label: 'Log out', variant: 'danger', onClick: () => { editing = null; settingsEdit = null; setGuard(null); toast('You are logged out.'); logout(); go('#/home'); } }],
  });

  return h('div', { class: 'profile-layout' },
    h('aside', { class: 'profile-side' },
      h('div', { class: 'profile-head' }, avatar(me, 'xl'), h('div', {}, h('h1', { class: `profile-name ${nameSizeClass(me.name)}` }, me.name), h('p', { class: 'muted' }, `${count} invite${count === 1 ? '' : 's'}`))),
      h('nav', { class: 'card menu-list', 'aria-label': 'Profile sections' },
        SECTIONS.map(([id, label]) => h('a', { href: id === 'profile' ? '#/profile' : `#/profile/${id}`, 'aria-current': id === section ? 'page' : null, dataset: { section: id } },
          label, id === 'profile' || id === 'personalization' ? unsavedMark(id === section && !!getGuard()?.isDirty()) : null)),
        h('button', { class: 'is-danger', type: 'button', onClick: askLogout }, 'Log out'))),
    content);
}
