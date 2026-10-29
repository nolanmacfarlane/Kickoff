// Profile tab: menu on the left (as in the sketch), section on the right. Onboarding answers are editable here.
import { inviteCard } from '../components/inviteCard';
import { calendarField, currentSportsField, desiredSportsField, draftFromUser, draftToProfile, identityFields, motivationField } from '../components/profileFields';
import { avatar, fmtAgo, go, h, keepFocus, toast } from '../dom';
import { activityFor, currentUser, logout, myPast, myUpcoming, updateProfile } from '../state';
import { openInvite } from './inviteDetail';

const SECTIONS: [string, string][] = [['profile', 'Your profile'], ['activity', 'Activity'], ['personalization', 'Personalization'], ['help', 'Help'], ['about', 'About us']];

function editor(kind: 'profile' | 'personalization'): HTMLElement
{
  const me = currentUser()!;
  const d = draftFromUser(me);
  let error = '';
  const root = h('div', {});
  function save(): void
  {
    if (kind === 'profile' && (!d.name.trim() || !d.area)) { error = 'Add your name and neighbourhood.'; return draw(); }
    if (kind === 'profile' && d.motivations.length === 0) { error = 'Pick at least one motivation.'; return draw(); }
    const p = draftToProfile(d);
    const res = updateProfile(kind === 'profile' ? { name: p.name, area: p.area, motivations: p.motivations } : { currentSports: p.currentSports, desiredSports: p.desiredSports, calendar: p.calendar });
    toast(res.ok ? 'Changes saved. Your suggestions are updated.' : res.error);
  }
  function draw(): void
  {
    keepFocus(() => root.replaceChildren(h('div', { class: 'card stack' },
      error ? h('p', { class: 'notice notice--error', role: 'alert' }, error) : null,
      kind === 'profile'
        ? [identityFields(d), motivationField(d, draw)]
        : [h('div', {}, h('h3', {}, 'Sports you play'), currentSportsField(d, draw)), h('div', {}, h('h3', {}, 'Sports you want to try'), desiredSportsField(d, draw)), h('div', {}, h('h3', {}, 'Calendar'), calendarField(d, draw))],
      h('div', {}, h('button', { class: 'btn btn--primary', type: 'button', onClick: save }, 'Save changes')))));
  }
  draw();
  return root;
}

export function render(args: string[]): HTMLElement
{
  const me = currentUser()!;
  const section = SECTIONS.some(([id]) => id === args[0]) ? args[0] : 'profile';
  const count = myUpcoming(me.id).length + myPast(me.id).length;

  let content: HTMLElement;
  if (section === 'profile' || section === 'personalization') content = editor(section);
  else if (section === 'activity')
  {
    const up = myUpcoming(me.id), past = myPast(me.id), log = activityFor(me.id);
    content = h('div', { class: 'stack' },
      h('section', {}, h('h2', {}, 'Upcoming'), up.length ? h('div', { class: 'rec-list' }, up.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id) }))) : h('p', { class: 'muted' }, 'Nothing planned.')),
      h('section', {}, h('h2', {}, 'Past meetups'), past.length ? h('div', { class: 'rec-list' }, past.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id) }))) : h('p', { class: 'muted' }, 'No past meetups yet.')),
      h('section', {}, h('h2', {}, 'History'), log.length ? h('ul', { class: 'card activity-list' }, log.map((a) => h('li', {}, h('span', {}, a.text), h('time', {}, fmtAgo(a.at))))) : h('p', { class: 'muted' }, 'No activity yet.')));
  } else if (section === 'help')
  {
    content = h('div', { class: 'card stack' }, h('h2', {}, 'Help'),
      h('p', {}, h('strong', {}, 'Find a game: '), 'Open Map or Home. Yellow tags show what matches your profile.'),
      h('p', {}, h('strong', {}, 'Start a game: '), 'Use Create invite. Sport, place, time and number of people are required.'),
      h('p', {}, h('strong', {}, 'Need gear? '), 'Look for the green "Gear shared" tag, or open a sport page to see rentals.'),
      h('p', {}, h('strong', {}, 'Make friends: '), 'Add people from a meetup you joined. Friends-only invites show just to friends.'));
  } else content = h('div', { class: 'card stack' }, h('h2', {}, 'About us'), h('p', {}, 'Pickup helps people play sports together on short notice, or plan ahead. This is a course prototype with made-up data.'));

  return h('div', {},
    h('div', { class: 'profile-head' }, avatar(me, 'xl'), h('div', {}, h('h1', {}, me.name), h('p', { class: 'muted' }, `${count} meetup${count === 1 ? '' : 's'}`))),
    h('div', { class: 'profile-layout' },
      h('nav', { class: 'card menu-list', 'aria-label': 'Profile sections' },
        SECTIONS.map(([id, label]) => h('a', { href: id === 'profile' ? '#/profile' : `#/profile/${id}`, 'aria-current': id === section ? 'page' : null }, label)),
        h('button', { class: 'is-danger', type: 'button', onClick: () => { logout(); go('#/home'); toast('You are logged out.'); } }, 'Log out')),
      content));
}
