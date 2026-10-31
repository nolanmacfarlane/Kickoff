// Create invite. Required: sport, location, capacity, time, at least one skill level. Everything else is optional.
import { mapWidget, type MapPin } from '../components/mapWidget';
import { seg, segMulti } from '../components/seg';
import { SKILLS, sports, venues } from '../data';
import { append, go, h, keepFocus, toast } from '../dom';
import { createInvite, currentUser, getSport, getVenue, MAX_CAPACITY, MIN_CAPACITY } from '../state';
import type { InviteLocation, Skill, Vibe, Visibility } from '../types';
import { openSportInfo } from './sportInfo';

interface Form {
  sportId: string; location: InviteLocation | null; spotName: string; date: string; start: string; end: string; recurring: boolean;
  capacity: number; skills: Skill[]; vibe: Vibe; visibility: Visibility; gearOn: boolean; gearText: string; notes: string;
}
let form: Form | null = null;
let formUser = '';
let error = '';

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function defaults(): Form {
  const me = currentUser()!;
  const t = new Date(Date.now() + 2 * 3_600_000); t.setMinutes(0, 0, 0);
  const e = new Date(t.getTime() + 90 * 60_000);
  const sportId = me.currentSports[0]?.sportId ?? me.desiredSports[0] ?? sports[0].id;
  return {
    sportId, location: null, spotName: '', date: dateStr(t), start: timeStr(t), end: dateStr(e) === dateStr(t) ? timeStr(e) : '23:59', recurring: false,
    capacity: 4, skills: [me.currentSports.find((s) => s.sportId === sportId)?.skill ?? 'Beginner'], vibe: 'Casual', visibility: 'open',
    gearOn: false, gearText: '', notes: '',
  };
}
function ensureForm(): Form {
  const me = currentUser()!;
  if (!form || formUser !== me.id) { form = defaults(); formUser = me.id; error = ''; }
  return form;
}

export function render(): HTMLElement {
  const f = ensureForm();
  const me = currentUser()!;
  const root = h('div', {});
  const skillOptions = SKILLS.map((v) => ({ value: v, label: v }));

  const handle = mapWidget({
    key: 'create', className: 'create-map', center: me, zoom: 12, pins: [],
    onSelect: (id) => { const v = getVenue(id.replace('v:', '')); if (v) { f.location = { label: v.name, lat: v.lat, lng: v.lng, venueId: v.id }; draw(); } },
    onPick: (lat, lng) => { f.location = { label: f.spotName.trim() || 'Custom pin', lat, lng }; draw(); },
  });

  function submit(): void {
    if (!f.date || !f.start || !f.end) { error = 'Choose a date, a start time and an end time.'; return draw(true); }
    const res = createInvite({
      sportId: f.sportId, location: f.location as InviteLocation, start: new Date(`${f.date}T${f.start}`).getTime(), end: new Date(`${f.date}T${f.end}`).getTime(),
      capacity: f.capacity, skills: f.skills, vibe: f.vibe, visibility: f.visibility,
      gear: { available: f.gearOn, description: f.gearText.trim() }, notes: f.notes.trim(), recurring: f.recurring,
    });
    if (!res.ok) { error = res.error; return draw(true); }
    form = null; error = '';
    toast('Invite created. It is now on the map.');
    go(`#/map/${res.id}`);
  }

  function where(): HTMLElement {
    const sorted = [...venues].sort((a, b) => Number(b.sportIds.includes(f.sportId)) - Number(a.sportIds.includes(f.sportId)));
    const venue = f.location?.venueId ? getVenue(f.location.venueId) : undefined;
    const pins: MapPin[] = venues.map((v) => ({ id: `v:${v.id}`, lat: v.lat, lng: v.lng, label: v.name, variant: 'venue' }));
    if (f.location && !f.location.venueId) pins.push({ id: 'draft', lat: f.location.lat, lng: f.location.lng, label: 'Your pin', variant: 'draft' });
    handle.setPins(pins, f.location?.venueId ? `v:${f.location.venueId}` : f.location ? 'draft' : null);
    return h('section', { class: 'card sticky-col', 'aria-labelledby': 'where-h' },
      h('h2', { id: 'where-h' }, 'Where'),
      h('div', { class: 'venue-list' }, sorted.map((v) => h('button', {
        type: 'button', class: 'venue-option', 'aria-pressed': f.location?.venueId === v.id, dataset: { key: `venue-${v.id}` },
        onClick: () => { f.location = { label: v.name, lat: v.lat, lng: v.lng, venueId: v.id }; draw(); handle.map.panTo([v.lat, v.lng]); },
      }, h('strong', {}, v.name), h('small', {}, `${v.area}${v.sportIds.includes(f.sportId) ? ', good for ' + getSport(f.sportId)!.name : ''}`)))),
      h('p', { class: 'field__hint' }, 'Pick a venue above or on the map, or click anywhere on the map to drop your own pin.'),
      handle.el,
      f.location && !f.location.venueId ? h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Name this spot (optional)'),
        h('input', { class: 'input', type: 'text', value: f.spotName, placeholder: 'e.g. Field behind the library', dataset: { key: 'spot' },
          onInput: (e: Event) => { f.spotName = (e.target as HTMLInputElement).value; f.location!.label = f.spotName.trim() || 'Custom pin'; } })) : null,
      venue ? h('div', { class: 'venue-card' }, h('h4', {}, venue.name),
        h('dl', {}, h('dt', {}, 'Hours'), h('dd', {}, venue.hours), h('dt', {}, 'Rentals'), h('dd', {}, venue.rentals.length ? venue.rentals.join(', ') : 'None on site')),
        h('p', { class: 'card__meta' }, venue.info)) : null,
      !f.location ? h('p', { class: 'field__hint' }, 'Required.') : null);
  }

  const field = (label: string, control: Node, hint?: string) =>
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, label), control, hint ? h('span', { class: 'field__hint' }, hint) : null);

  function draw(scrollToError = false): void {
    keepFocus(() => { root.replaceChildren(); append(root, [
      error ? h('p', { class: 'notice notice--error form-error', role: 'alert', id: 'form-error' }, error) : null,
      h('div', { class: 'cols' },
        h('div', { class: 'create-form' },
          h('section', { class: 'card' }, h('h2', {}, 'What and when'),
            h('div', { class: 'field' },
              h('label', { class: 'field__label', for: 'sport-select' }, 'Sport'),
              h('select', { class: 'select', id: 'sport-select', value: f.sportId, dataset: { key: 'sport' }, onChange: (e: Event) => { f.sportId = (e.target as HTMLSelectElement).value; draw(); } },
                sports.map((s) => h('option', { value: s.id }, s.name))),
              h('button', { class: 'btn btn--text link-btn', type: 'button', onClick: () => openSportInfo(f.sportId) }, `About ${getSport(f.sportId)!.name}: gear and where to borrow`)),
            h('div', { class: 'field-row' },
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Date'), h('input', { class: 'input', type: 'date', value: f.date, min: dateStr(new Date()), dataset: { key: 'date' }, onChange: (e: Event) => { f.date = (e.target as HTMLInputElement).value; } })),
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Starts'), h('input', { class: 'input', type: 'time', value: f.start, dataset: { key: 'start' }, onChange: (e: Event) => { f.start = (e.target as HTMLInputElement).value; } })),
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Ends'), h('input', { class: 'input', type: 'time', value: f.end, dataset: { key: 'end' }, onChange: (e: Event) => { f.end = (e.target as HTMLInputElement).value; } }))),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.recurring, dataset: { key: 'rec' }, onChange: (e: Event) => { f.recurring = (e.target as HTMLInputElement).checked; } }),
              h('span', { class: 'check__text' }, 'Repeat every week', h('small', {}, 'Good for an informal team or regular group.')))),
          h('section', { class: 'card' }, h('h2', {}, 'Who can join'),
            h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'How many people, including you'),
              h('input', { class: 'input input--narrow', type: 'number', min: MIN_CAPACITY, max: MAX_CAPACITY, value: String(f.capacity), dataset: { key: 'capacity' },
                onInput: (e: Event) => { f.capacity = parseInt((e.target as HTMLInputElement).value, 10); } })),
            field('Skill levels welcome', segMulti<Skill>('skill', skillOptions, f.skills, (v) => { f.skills = v; draw(); }), 'Choose every level that is welcome.'),
            field('Vibe', seg<Vibe>('vibe', [{ value: 'Casual', label: 'Casual' }, { value: 'Competitive', label: 'Competitive' }], f.vibe, (v) => { f.vibe = v; draw(); })),
            field('Who can see it', seg<Visibility>('vis', [{ value: 'open', label: 'Open to everyone' }, { value: 'friends', label: 'Friends only' }], f.visibility, (v) => { f.visibility = v; draw(); }),
              f.visibility === 'friends' ? 'Only your friends will see this on the map.' : 'Anyone nearby can see it on the map.')),
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
        where()),
    ]);
    handle.map.invalidateSize(); });
    if (scrollToError) document.getElementById('form-error')?.scrollIntoView?.({ block: 'center' });
  }

  draw();
  return root;
}
