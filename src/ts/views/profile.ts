// Profile tab: menu on the left (as in the sketch), section on the right. All onboarding answers are edited in "Your profile".
import { inviteCard } from '../components/inviteCard';
import {
  calendarField, draftFromUser, draftToProfile, identityFields, motivationField, pendingSports, sportsField, type ProfileDraft,
} from '../components/profileFields';
import { seg } from '../components/seg';
import { avatar, confirmDialog, fmtAgo, go, h, keepFocus, toast } from '../dom';
import { setGuard } from '../nav';
import type { ActivityItem } from '../types';
import { activityFor, currentUser, logout, myPast, myUpcoming, updateProfile, updateSettings } from '../state';
import { openInvite } from './inviteDetail';
import { openSportInfo } from './sportInfo';

const SECTIONS: [string, string][] = [['profile', 'Your profile'], ['activity', 'Activity'], ['personalization', 'Personalization'], ['help', 'Help'], ['about', 'About us']];

// The unsaved draft lives here so a re-render does not throw away what the user typed.
let editing: { userId: string; initial: string; draft: ProfileDraft } | null = null;

function profileEditor(): HTMLElement {
  const me = currentUser()!;
  if (!editing || editing.userId !== me.id) { const d = draftFromUser(me); editing = { userId: me.id, initial: JSON.stringify(d), draft: d }; }
  const ed = editing;
  const d = ed.draft;
  let error = '';
  const root = h('div', {});
  const dirty = () => JSON.stringify(d) !== ed.initial;

  function save(): boolean {
    if (!d.name.trim()) { error = 'Add your name.'; draw(); return false; }
    if (!d.address.trim()) { error = 'Add your address.'; draw(); return false; }
    if (d.motivations.length === 0) { error = 'Pick at least one thing you are looking for.'; draw(); return false; }
    if (pendingSports(d).length) { error = `Choose a level for ${pendingSports(d).join(', ')}, or remove it.`; draw(); return false; }
    editing = null; setGuard(null);              // clear first: updateProfile triggers a re-render
    const res = updateProfile(draftToProfile(d));
    if (!res.ok) { editing = ed; error = res.error; draw(); return false; }
    toast('Profile saved. Your suggestions are updated.');
    return true;
  }
  setGuard({ isDirty: dirty, save, discard: () => { editing = null; } });

  function draw(): void {
    keepFocus(() => root.replaceChildren(h('div', { class: 'stack' },
      h('section', { class: 'card stack' }, h('h2', {}, 'About you'), identityFields(d), motivationField(d, draw)),
      h('section', { class: 'card stack' }, h('h2', {}, 'Sports'), sportsField(d, draw, openSportInfo)),
      h('section', { class: 'card stack' }, h('h2', {}, 'Schedule'), calendarField(d, draw)),
      error ? h('p', { class: 'notice notice--error', role: 'alert' }, error) : null,
      h('div', {}, h('button', { class: 'btn btn--primary', type: 'button', onClick: save }, 'Save changes')))));
  }
  draw();
  return root;
}

function personalization(): HTMLElement {
  const me = currentUser()!;
  const s = me.settings;
  const toggle = (key: 'joins' | 'leaves' | 'friends' | 'messages' | 'friendInvites', label: string, hint: string) =>
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.notify[key], dataset: { key: `notify-${key}` }, onChange: (e: Event) => { updateSettings({ notify: { [key]: (e.target as HTMLInputElement).checked } }); } }),
      h('span', { class: 'check__text' }, label, h('small', {}, hint)));
  return h('div', { class: 'stack' },
    h('section', { class: 'card stack' }, h('h2', {}, 'Appearance'),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Theme'),
        seg('theme', [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], s.theme, (v) => updateSettings({ theme: v })))),
    h('section', { class: 'card stack' }, h('h2', {}, 'Distance'),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Show distances in'),
        seg('units', [{ value: 'km', label: 'Kilometres' }, { value: 'mi', label: 'Miles' }], s.units, (v) => updateSettings({ units: v })))),
    h('section', { class: 'card stack' }, h('h2', {}, 'Notifications'),
      toggle('joins', 'Someone joins my meetup', 'Includes when a meetup fills up.'),
      toggle('leaves', 'Someone leaves my meetup', 'Changes apply straight away.'),
      toggle('friends', 'Friend requests', 'New requests and when yours is accepted.'),
      toggle('friendInvites', 'Friends create an invite', 'When a friend starts a meetup you can see.'),
      toggle('messages', 'New messages', 'Counts unread chats in the Social tab badge.')));
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
  return h('div', { class: 'card stack' }, h('h2', {}, 'Frequently asked questions'),
    h('div', { class: 'faq-list' }, FAQS.map(([q, a]) => h('details', { class: 'faq' }, h('summary', {}, q), h('p', {}, a)))),
    h('div', {}, h('button', { class: 'btn btn--secondary', type: 'button' }, 'Contact support')));   // intentionally does nothing
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
      h('section', {}, h('h2', {}, 'Upcoming'), up.length ? h('div', { class: 'card-list' }, up.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id), onAbout: () => openSportInfo(i.sportId) }))) : h('div', { class: 'empty empty--tight' }, 'Nothing planned.')),
      h('section', {}, h('h2', {}, 'Past meetups'), past.length ? h('div', { class: 'card-list' }, past.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id), onAbout: () => openSportInfo(i.sportId) }))) : h('div', { class: 'empty empty--tight' }, 'No past meetups yet.')),
      h('section', {}, h('h2', {}, 'History'), log.length ? h('ul', { class: 'card activity-list' }, log.map((a) => h('li', {}, h('span', {}, a.text), h('time', {}, fmtAgo(a.at))))) : h('div', { class: 'empty empty--tight' }, 'No activity yet.'),
        log.length ? h('div', { class: 'activity-export' }, h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => exportHistory(me.name, log) }, 'Export history')) : null));
  } else content = h('div', { class: 'card stack' }, h('h2', {}, 'About us'), h('p', {}, 'Kickoff helps people play sports together on short notice, or plan ahead. This is a course prototype with made-up data.'),
    h('p', { class: 'muted' }, 'Sport icons by Phosphor Icons (MIT licence). Map data from OpenStreetMap contributors, map tiles by CARTO, map library Leaflet.'));

  const askLogout = () => confirmDialog({
    title: 'Log out?', body: 'You will go back to the welcome screen.',
    actions: [{ label: 'Stay logged in' }, { label: 'Log out', variant: 'danger', onClick: () => { editing = null; setGuard(null); logout(); go('#/home'); toast('You are logged out.'); } }],
  });

  return h('div', {},
    h('div', { class: 'profile-head' }, avatar(me, 'xl'), h('div', {}, h('h1', {}, me.name), h('p', { class: 'muted' }, `${count} meetup${count === 1 ? '' : 's'}`))),
    h('div', { class: 'profile-layout' },
      h('nav', { class: 'card menu-list', 'aria-label': 'Profile sections' },
        SECTIONS.map(([id, label]) => h('a', { href: id === 'profile' ? '#/profile' : `#/profile/${id}`, 'aria-current': id === section ? 'page' : null }, label)),
        h('button', { class: 'is-danger', type: 'button', onClick: askLogout }, 'Log out')),
      content));
}
