// Create invite. Required: sport, location, capacity, time. Everything else is optional.
import { mapWidget } from '../components/mapWidget';
import { seg } from '../components/seg';
import { sports, venues } from '../data';
import { append, go, h, keepFocus, toast } from '../dom';
import { createInvite, currentUser, getSport, getVenue, MAX_CAPACITY, MIN_CAPACITY } from '../state';
import type { InviteLocation, InviteSkill, Vibe, Visibility } from '../types';

interface Form
{
  sportId: string; location: InviteLocation | null; spotName: string; date: string; start: string; end: string;
  capacity: number; skill: InviteSkill; vibe: Vibe; visibility: Visibility;
  gearOn: boolean; gearText: string; notes: string; recurring: boolean;
}
let form: Form | null = null;
let formUser = '';
let error = '';

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function defaults(): Form
{
  const me = currentUser()!;
  const t = new Date(Date.now() + 2 * 3_600_000); t.setMinutes(0, 0, 0);
  const e = new Date(t.getTime() + 90 * 60_000);
  const sportId = me.currentSports[0]?.sportId ?? me.desiredSports[0] ?? sports[0].id;
  return {
    sportId, location: null, spotName: '', date: dateStr(t), start: timeStr(t), end: dateStr(e) === dateStr(t) ? timeStr(e) : '23:59',
    capacity: 4, skill: me.currentSports.find((s) => s.sportId === sportId)?.skill ?? 'Beginner', vibe: 'Casual', visibility: 'open',
    gearOn: false, gearText: '', notes: '', recurring: false,
  };
}
function ensureForm(): Form
{
  const me = currentUser()!;
  if (!form || formUser !== me.id) { form = defaults(); formUser = me.id; error = ''; }
  return form;
}
/** Used by the Sport page's "Create an invite" button. */
export function presetSport(sportId: string): void { ensureForm().sportId = sportId; }

export function render(): HTMLElement
{
  const f = ensureForm();
  const root = h('div', {});

  function submit(): void
  {
    if (!f.date || !f.start || !f.end) { error = 'Choose a date, a start time and an end time.'; return draw(true); }
    const res = createInvite({
      sportId: f.sportId, location: f.location as InviteLocation, start: new Date(`${f.date}T${f.start}`).getTime(), end: new Date(`${f.date}T${f.end}`).getTime(),
      capacity: f.capacity, skill: f.skill, vibe: f.vibe, visibility: f.visibility,
      gear: { available: f.gearOn, description: f.gearText.trim() }, notes: f.notes.trim(), recurring: f.recurring,
    });
    if (!res.ok) { error = res.error; return draw(true); }
    form = null; error = '';
    toast('Invite created. It is now on the map.');
    go(`#/map/${res.id}`);
  }

  function where(): HTMLElement
  {
    const sorted = [...venues].sort((a, b) => Number(b.sportIds.includes(f.sportId)) - Number(a.sportIds.includes(f.sportId)));
    const venue = f.location?.venueId ? getVenue(f.location.venueId) : undefined;
    const pins = venues.map((v) => ({ id: `v:${v.id}`, x: v.x, y: v.y, label: v.name, variant: 'venue' as const }));
    if (f.location && !f.location.venueId) pins.push({ id: 'draft', x: f.location.x, y: f.location.y, label: 'Your pin', variant: 'draft' as never });
    return h('section', { class: 'card sticky-col', 'aria-labelledby': 'where-h' },
      h('h2', { id: 'where-h' }, 'Where'),
      h('div', { class: 'venue-list' }, sorted.map((v) => h('button', {
        type: 'button', class: 'venue-option', 'aria-pressed': f.location?.venueId === v.id, dataset: { key: `venue-${v.id}` },
        onClick: () => { f.location = { label: v.name, x: v.x, y: v.y, venueId: v.id }; draw(); },
      }, h('strong', {}, v.name), h('small', {}, `${v.area}${v.sportIds.includes(f.sportId) ? ', good for ' + getSport(f.sportId)!.name : ''}`)))),
      mapWidget({
        className: 'create-map', pins, selectedId: f.location?.venueId ? `v:${f.location.venueId}` : f.location ? 'draft' : null,
        hint: 'Pick a venue, or click the map to drop your own pin',
        onSelect: (id) => { const v = getVenue(id.replace('v:', '')); if (v) { f.location = { label: v.name, x: v.x, y: v.y, venueId: v.id }; draw(); } },
        onPick: (x, y) => { f.location = { label: f.spotName.trim() || 'Custom pin', x, y }; draw(); },
      }),
      f.location && !f.location.venueId ? h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Name this spot (optional)'),
        h('input', {
          class: 'input', type: 'text', value: f.spotName, placeholder: 'e.g. Field behind the library', dataset: { key: 'spot' },
          onInput: (e: Event) => { f.spotName = (e.target as HTMLInputElement).value; f.location!.label = f.spotName.trim() || 'Custom pin'; }
        })) : null,
      venue ? h('div', { class: 'venue-card' }, h('h4', {}, venue.name),
        h('dl', {}, h('dt', {}, 'Hours'), h('dd', {}, venue.hours), h('dt', {}, 'Rentals'), h('dd', {}, venue.rentals.length ? venue.rentals.join(', ') : 'None on site')),
        h('p', { class: 'card__meta' }, venue.info)) : null,
      !f.location ? h('p', { class: 'field__hint' }, 'Required. Choose where people should meet.') : null);
  }

  function draw(scrollToError = false): void
  {
    keepFocus(() =>
    {
      root.replaceChildren(); append(root, [
        h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Create an invite'), h('p', {}, 'Choose a sport, a place and a time. People nearby can join straight away.'))),
        error ? h('p', { class: 'notice notice--error form-error', role: 'alert', id: 'form-error' }, error) : null,
        h('div', { class: 'cols' },
          h('div', { class: 'create-form' },
            h('section', { class: 'card' }, h('h2', {}, 'What and when'),
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Sport'),
                h('select', { class: 'select', value: f.sportId, dataset: { key: 'sport' }, onChange: (e: Event) => { f.sportId = (e.target as HTMLSelectElement).value; draw(); } },
                  sports.map((s) => h('option', { value: s.id }, s.name))),
                h('a', { href: `#/sport/${f.sportId}`, class: 'field__hint' }, `Gear and how to start ${getSport(f.sportId)!.name}`)),
              h('div', { class: 'field-row' },
                h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Date'), h('input', { class: 'input', type: 'date', value: f.date, min: dateStr(new Date()), dataset: { key: 'date' }, onChange: (e: Event) => { f.date = (e.target as HTMLInputElement).value; } })),
                h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Starts'), h('input', { class: 'input', type: 'time', value: f.start, dataset: { key: 'start' }, onChange: (e: Event) => { f.start = (e.target as HTMLInputElement).value; } })),
                h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Ends'), h('input', { class: 'input', type: 'time', value: f.end, dataset: { key: 'end' }, onChange: (e: Event) => { f.end = (e.target as HTMLInputElement).value; } })))),
            h('section', { class: 'card' }, h('h2', {}, 'Who can join'),
              h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'How many people, including you'),
                h('div', { class: 'stepper-row' },
                  h('button', { class: 'btn btn--secondary', type: 'button', 'aria-label': 'Fewer people', disabled: f.capacity <= MIN_CAPACITY, dataset: { key: 'cap-', }, onClick: () => { f.capacity--; draw(); } }, '\u2212'),
                  h('output', { 'aria-live': 'polite' }, String(f.capacity)),
                  h('button', { class: 'btn btn--secondary', type: 'button', 'aria-label': 'More people', disabled: f.capacity >= MAX_CAPACITY, dataset: { key: 'cap+' }, onClick: () => { f.capacity++; draw(); } }, '+'))),
              h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Skill level'),
                seg<InviteSkill>('skill', (['Beginner', 'Intermediate', 'Advanced', 'All levels'] as InviteSkill[]).map((v) => ({ value: v, label: v })), f.skill, (v) => { f.skill = v; draw(); })),
              h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Vibe'),
                seg<Vibe>('vibe', [{ value: 'Casual', label: 'Casual' }, { value: 'Competitive', label: 'Competitive' }], f.vibe, (v) => { f.vibe = v; draw(); })),
              h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Who can see it'),
                seg<Visibility>('vis', [{ value: 'open', label: 'Open to everyone' }, { value: 'friends', label: 'Friends only' }], f.visibility, (v) => { f.visibility = v; draw(); }),
                h('span', { class: 'field__hint' }, f.visibility === 'friends' ? 'Only your friends will see this on the map.' : 'Anyone nearby can see it on the map.')),
              h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.recurring, dataset: { key: 'rec' }, onChange: (e: Event) => { f.recurring = (e.target as HTMLInputElement).checked; } }),
                h('span', { class: 'check__text' }, 'Repeat every week', h('small', {}, 'Good for an informal team or regular group.')))),
            h('section', { class: 'card' }, h('h2', {}, 'Extras'),
              h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.gearOn, dataset: { key: 'gear' }, onChange: (e: Event) => { f.gearOn = (e.target as HTMLInputElement).checked; draw(); } }),
                h('span', { class: 'check__text' }, 'I have gear to share', h('small', {}, 'Helps newcomers who do not own any yet.'))),
              f.gearOn ? h('div', { class: 'gear-fields' }, h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'What can you share?'),
                h('input', { class: 'input', type: 'text', value: f.gearText, placeholder: 'e.g. One spare glove and a bat', dataset: { key: 'geartext' }, onInput: (e: Event) => { f.gearText = (e.target as HTMLInputElement).value; } }))) : null,
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Notes (optional)'),
                h('textarea', { class: 'textarea', value: f.notes, placeholder: 'Anything people should know before they come', dataset: { key: 'notes' }, onInput: (e: Event) => { f.notes = (e.target as HTMLTextAreaElement).value; } }))),
            h('div', { class: 'create-form__actions' },
              h('button', { class: 'btn btn--primary', type: 'button', onClick: submit }, 'Create invite'),
              h('a', { class: 'btn btn--secondary', href: '#/home' }, 'Cancel'))),
          where())]);
    });
    if (scrollToError) document.getElementById('form-error')?.scrollIntoView({ block: 'center' });
  }

  draw();
  return root;
}
