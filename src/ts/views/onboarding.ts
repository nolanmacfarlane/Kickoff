// Onboarding wizard: 3 short steps with a slide between them. "Skip with demo user" is on every step.
import { blankDraft, calendarField, draftToProfile, identityFields, motivationField, sportsField, type ProfileDraft } from '../components/profileFields';
import { firstName, go, h, keepFocus, toast } from '../dom';
import { completeOnboarding, loginDemo } from '../state';
import { openSportInfo } from './sportInfo';

export function render(): HTMLElement {
  const d: ProfileDraft = blankDraft();
  let step = 0;
  let error = '';
  let dir: 'forward' | 'back' | null = null;   // set only when the step changes, so edits do not re-animate
  const root = h('div', { class: 'onboarding' });
  const LAST = 2;

  const titles = [
    ['Welcome to Kickoff', 'Tell us a little about you and we will suggest games that fit. It takes about a minute.'],
    ['Your sports', 'Search for a sport, then choose your level, or mark it as one you want to try.'],
    ['Add your schedule', 'Optional. Connect a calendar so suggestions match when you are free.'],
  ];

  function body(): HTMLElement {
    if (step === 0) return h('div', { class: 'stack' }, identityFields(d), motivationField(d, draw));
    if (step === 1) return sportsField(d, draw, openSportInfo);
    return calendarField(d, draw);
  }

  function go_(to: number): void { dir = to > step ? 'forward' : 'back'; step = to; error = ''; draw(); }

  function next(): void {
    error = '';
    if (step === 0) {
      if (!d.name.trim()) error = 'Enter your name to continue.';
      else if (!d.address.trim()) error = 'Enter your address to continue.';
      else if (d.motivations.length === 0) error = 'Pick at least one thing you are looking for.';
      if (error) { dir = null; return draw(); }
    }
    if (step < LAST) return go_(step + 1);
    const res = completeOnboarding(draftToProfile(d));
    if (!res.ok) { error = res.error; dir = null; return draw(); }
    toast(`Welcome, ${firstName(d.name)}. Here are games that fit you.`);
    go('#/home');
  }

  function draw(): void {
    const slide = dir ? `slide-${dir}` : '';
    dir = null;
    keepFocus(() => root.replaceChildren(
      h('div', { class: 'card onboarding__card' },
        h('div', { class: 'stepper', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': LAST + 1, 'aria-valuenow': step + 1, 'aria-label': `Step ${step + 1} of ${LAST + 1}` },
          titles.map((_, i) => h('span', { class: 'stepper__step', dataset: { state: i < step ? 'done' : i === step ? 'current' : 'todo' } }))),
        h('div', { class: `onboarding__step ${slide}`.trim() }, h('h1', {}, titles[step][0]), h('p', { class: 'onboarding__lede' }, titles[step][1]), body()),
        error ? h('p', { class: 'notice notice--error', role: 'alert' }, error) : null,   // below the fields, above the buttons
        h('div', { class: 'onboarding__actions' },
          step > 0 ? h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => go_(step - 1) }, 'Back') : h('span'),
          h('button', { class: 'btn btn--primary', type: 'button', dataset: { key: 'next' }, onClick: next }, step === LAST ? 'Finish setup' : 'Continue'))),
      h('p', { class: 'onboarding__skip' }, h('button', { class: 'btn btn--text', type: 'button', onClick: () => { loginDemo(); go('#/home'); } }, 'Skip with demo user'))));
  }

  draw();
  return root;
}
