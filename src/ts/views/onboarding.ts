// Onboarding wizard: 4 short steps. "Skip with demo user" is available throughout for testing.
import { blankDraft, calendarField, currentSportsField, desiredSportsField, draftToProfile, identityFields, motivationField, type ProfileDraft } from '../components/profileFields';
import { firstName, go, h, keepFocus, toast } from '../dom';
import { completeOnboarding, loginDemo } from '../state';

export function render(): HTMLElement
{
  const d: ProfileDraft = blankDraft();
  let step = 0;
  let error = '';
  const root = h('div', { class: 'onboarding' });
  const LAST = 3;

  const titles = [
    ['Welcome to Pickup', 'Tell us a little about you and we will suggest games that fit. It takes about a minute.'],
    ['What do you play now?', 'Pick your sports and your level in each. Skip this if you are brand new.'],
    ['What do you want to try?', 'We will show games for these, with gear sharing when it is offered.'],
    ['Add your schedule', 'Optional. Connect a calendar so suggestions match when you are free.'],
  ];

  function body(): HTMLElement
  {
    if (step === 0) return h('div', { class: 'stack' }, identityFields(d), motivationField(d, draw));
    if (step === 1) return currentSportsField(d, draw);
    if (step === 2) return desiredSportsField(d, draw);
    return calendarField(d, draw);
  }

  function next(): void
  {
    error = '';
    if (step === 0)
    {
      if (!d.name.trim()) error = 'Enter your name to continue.';
      else if (!d.area) error = 'Choose where you usually play.';
      else if (d.motivations.length === 0) error = 'Pick at least one thing you are looking for.';
      if (error) return draw();
    }
    if (step < LAST) { step++; return draw(); }
    const res = completeOnboarding(draftToProfile(d));
    if (!res.ok) { error = res.error; return draw(); }
    toast(`Welcome, ${firstName(d.name)}. Here are games that fit you.`);
    go('#/home');
  }

  function draw(): void
  {
    keepFocus(() => root.replaceChildren(
      h('div', { class: 'card onboarding__card' },
        h('div', { class: 'stepper', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': LAST + 1, 'aria-valuenow': step + 1, 'aria-label': `Step ${step + 1} of ${LAST + 1}` },
          titles.map((_, i) => h('span', { class: 'stepper__step', dataset: { state: i < step ? 'done' : i === step ? 'current' : 'todo' } }))),
        h('h1', {}, titles[step][0]),
        h('p', { class: 'onboarding__lede' }, titles[step][1]),
        error ? h('p', { class: 'notice notice--error', role: 'alert' }, error) : null,
        body(),
        h('div', { class: 'onboarding__actions' },
          step > 0 ? h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => { error = ''; step--; draw(); } }, 'Back') : h('span'),
          h('button', { class: 'btn btn--primary', type: 'button', dataset: { key: 'next' }, onClick: next }, step === LAST ? 'Finish setup' : 'Continue'))),
      h('p', { class: 'onboarding__skip' }, h('button', { class: 'btn btn--text', type: 'button', onClick: () => { loginDemo(); go('#/home'); } }, 'Skip with demo user'))));
  }

  draw();
  return root;
}
