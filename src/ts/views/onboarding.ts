// Onboarding wizard: 5 short steps with a slide between them. "Skip with demo user" is on every step.
import { blankDraft, calendarField, draftToProfile, identityFields, motivationField, pendingSports, sportsField, type ProfileDraft } from '../components/profileFields';
import { seg } from '../components/seg';
import { avatar, firstName, go, h, keepFocus, toast } from '../dom';
import { DISTANCES } from '../geo';
import { completeOnboarding, loginDemo, sendFriendRequest, suggestFriends } from '../state';
import type { MaxDistance } from '../types';
import { openSportInfo } from './sportInfo';

const UNITS = 'km';   // the default; it can be changed later in Personalization

export function render(): HTMLElement {
  const d: ProfileDraft = blankDraft();
  let step = 0;
  let error = '';
  let dir: 'forward' | 'back' | null = null;   // set only when the step changes, so edits do not re-animate
  let maxDistance: MaxDistance = 'any';          // saved to settings, not the profile
  const picked = new Set<string>();              // people to send friend requests to once the account exists
  const root = h('div', { class: 'onboarding' });
  const LAST = 4;
  const suggestions = () => suggestFriends(draftToProfile(d), maxDistance, UNITS);

  const titles: [string, string, boolean?][] = [   // [heading, lede, optional]
    ['Welcome to Kickoff', 'Tell us a little about you and we will suggest games that fit. It takes about a minute.'],
    ['Why you play', 'We use this to suggest games with the right vibe.'],
    ['Your sports', 'Search for a sport and add it, then choose your level, or mark it as one you want to try.'],
    ['Add your schedule', 'Connect a calendar, or tell us when you are usually free, so suggestions fit your week.', true],
    ['Find people to play with', 'These people play your sports near you. Add a few and see the games they are going to.', true],
  ];

  const distanceField = () => h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'How far will you travel for a game?'),
    seg<MaxDistance>('max-distance', (['near', 'mid', 'far', 'any'] as MaxDistance[]).map((v) => ({ value: v, label: v === 'any' ? 'Any distance' : `${DISTANCES[UNITS][v]} ${UNITS}` })),
      maxDistance, (v) => { maxDistance = v; draw(); }),
    h('span', { class: 'field__hint' }, 'From your address. You can change this later in Personalization.'));

  function friendsField(): HTMLElement {
    const list = suggestions();
    if (!list.length) return h('div', { class: 'empty empty--tight' }, 'No one matches yet. You can add friends later from people you meet at games.');
    return h('ul', { class: 'friend-list' }, list.map(({ user: u, place, shared }) => {
      const on = picked.has(u.id);
      return h('li', { class: 'friend-row' }, avatar(u),
        h('div', { class: 'friend-row__info' }, h('strong', {}, u.name), h('p', { class: 'card__meta' }, place),
          shared.length ? h('p', { class: 'card__meta' }, `In common: ${shared.join(', ')}`) : null),
        // same labels and look as Invite details. Requests are only sent on Finish, so "Requested" can still be tapped to undo.
        h('button', { class: `btn btn--secondary btn--sm${on ? ' btn--requested' : ''}`, type: 'button', 'aria-pressed': on, dataset: { key: `friend-${u.id}` },
          'aria-label': on ? `Cancel friend request to ${u.name}` : `Add ${u.name} as a friend`, title: on ? 'Tap to cancel' : undefined,
          onClick: () => { if (on) picked.delete(u.id); else picked.add(u.id); draw(); } }, on ? 'Requested' : 'Add friend'));
    }));
  }


  function body(): HTMLElement {
    if (step === 0) return h('div', { class: 'stack' }, identityFields(d), distanceField());
    if (step === 1) return motivationField(d, draw);
    if (step === 2) return sportsField(d, draw, openSportInfo, { categories: true });
    if (step === 3) return calendarField(d, draw);
    return friendsField();
  }

  function go_(to: number): void { dir = to > step ? 'forward' : 'back'; step = to; error = ''; draw(); }

  function next(): void {
    error = '';
    if (step === 0) {
      if (!d.name.trim()) error = 'Enter your name to continue.';
      else if (!d.address.trim()) error = 'Enter your address to continue.';
      if (error) { dir = null; return draw(); }
    }
    if (step === 1 && d.motivations.length === 0) { error = 'Pick at least one thing you are looking for.'; dir = null; return draw(); }
    if (step === 2 && Object.keys(d.sports).length === 0) { error = 'Add at least one sport to continue.'; dir = null; return draw(); }
    if (step === 2 && pendingSports(d).length) { error = `Choose a level for ${pendingSports(d).join(', ')}, or remove it.`; dir = null; return draw(); }
    if (step < LAST) return go_(step + 1);
    const res = completeOnboarding(draftToProfile(d), { maxDistance });
    if (!res.ok) { error = res.error; dir = null; return draw(); }
    // only people still suggested (going back and changing sports or distance can drop someone)
    const sent = suggestions().filter((s) => picked.has(s.user.id) && sendFriendRequest(s.user.id).ok).length;
    toast(`Welcome, ${firstName(d.name)}. Here are games that fit you.${sent ? ` Sent ${sent} friend request${sent > 1 ? 's' : ''}.` : ''}`);
    go('#/home');
  }

  function draw(): void {
    const slide = dir ? `slide-${dir}` : '';
    dir = null;
    keepFocus(() => root.replaceChildren(
      h('div', { class: 'card onboarding__card' },
        h('div', { class: 'stepper', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': LAST + 1, 'aria-valuenow': step + 1, 'aria-label': `Step ${step + 1} of ${LAST + 1}` },
          titles.map((_, i) => h('span', { class: 'stepper__step', dataset: { state: i < step ? 'done' : i === step ? 'current' : 'todo' } }))),
        h('div', { class: `onboarding__step ${slide}`.trim() }, h('h1', { class: 'onboarding__title' }, titles[step][0], titles[step][2] ? h('span', { class: 'tag tag--optional' }, 'Optional') : null), h('p', { class: 'onboarding__lede' }, titles[step][1]), body()),
        error ? h('p', { class: 'notice notice--error', role: 'alert' }, error) : null,   // below the fields, above the buttons
        h('div', { class: 'onboarding__actions' },
          step > 0 ? h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => go_(step - 1) }, 'Back') : h('span'),
          h('button', { class: 'btn btn--primary', type: 'button', dataset: { key: 'next' }, onClick: next }, step === LAST ? 'Finish setup' : 'Continue'))),
      h('p', { class: 'onboarding__skip' }, h('button', { class: 'btn btn--text', type: 'button', onClick: () => { loginDemo(); go('#/home'); } }, 'Skip with demo user'))));
  }

  draw();
  return root;
}
