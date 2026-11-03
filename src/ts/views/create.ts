// Create invite. Required: sport, location, capacity, time, at least one skill level. Everything else is optional.
import { mapWidget, type MapPin } from '../components/mapWidget';
import { describeConflicts } from '../components/joinFlow';
import { uiIcon } from '../components/sportBits';
import { seg, segMulti } from '../components/seg';
import { SKILLS, sports, venues } from '../data';
import { append, confirmDialog, go, h, iconButton, keepFocus, toast } from '../dom';
import { conflictsFor, createInvite, currentUser, getSport, getVenue, MAX_CAPACITY, MIN_CAPACITY } from '../state';
import type { InviteLocation, Skill, Venue, Vibe, Visibility } from '../types';
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

  function submit(force = false): void {
    if (!f.date || !f.start || !f.end) { error = 'Choose a date, a start time and an end time.'; return draw(true); }
    const res = createInvite({
      sportId: f.sportId, location: f.location as InviteLocation, start: new Date(`${f.date}T${f.start}`).getTime(), end: new Date(`${f.date}T${f.end}`).getTime(),
      capacity: f.capacity, skills: f.skills, vibe: f.vibe, visibility: f.visibility,
      gear: { available: f.gearOn, description: f.gearText.trim() }, notes: f.notes.trim(), recurring: f.recurring,
    }, Date.now(), force);
    if (!res.ok && res.conflicts?.length) {
      confirmDialog({
        title: 'This overlaps with another meetup',
        body: `You are already going to ${describeConflicts(res.conflicts)}. Create this invite anyway?`,
        actions: [{ label: 'Go back and change the time' }, { label: 'Create anyway', variant: 'primary', onClick: () => submit(true) }],
      });
      return;
    }
    if (!res.ok) { error = res.error; return draw(true); }
    form = null; error = '';
    toast('Invite created. It is now on the map.');
    go(`#/map/${res.id}`);
  }

  // Overlap warning under the date and times. Built once and refreshed as the times change, so it shows straight away.
  const conflictEl = h('div', { class: 'conflict-slot', role: 'status', 'aria-live': 'polite' });
  function refreshConflict(): void {
    const start = new Date(`${f.date}T${f.start}`).getTime(), end = new Date(`${f.date}T${f.end}`).getTime();
    const clash = f.date && f.start && f.end && end > start ? conflictsFor(me.id, start, end) : [];
    conflictEl.replaceChildren();
    if (clash.length) append(conflictEl, [h('p', { class: 'field-warning' }, uiIcon('warning', 'icon icon--inline'),
      h('span', {}, `This overlaps with ${describeConflicts(clash)}, which you are already going to. You can still create it.`))]);
  }
  const onTime = (key: 'date' | 'start' | 'end') => (e: Event) => { f[key] = (e.target as HTMLInputElement).value; refreshConflict(); };

  // Venue search sits under the map. The input and results are created once so typing never loses focus.
  let query = '';
  const results = h('div', { class: 'venue-results' });
  const searchInput = h('input', { class: 'input', type: 'search', placeholder: 'Search venues, areas or sports', 'aria-label': 'Search venues', dataset: { key: 'venue-search' },
    onInput: (e: Event) => { query = (e.target as HTMLInputElement).value; fillResults(); } });

  function pick(v: Venue): void {
    f.location = { label: v.name, lat: v.lat, lng: v.lng, venueId: v.id };
    handle.map.setView([v.lat, v.lng], Math.max(handle.map.getZoom(), 15));
    draw();
  }
  function fillResults(): void {
    const q = query.trim().toLowerCase();
    results.replaceChildren();
    if (!q) return;
    const matches = venues.filter((v) => [v.name, v.area, v.kind, ...v.sportIds.map((id) => getSport(id)?.name ?? '')].some((t) => t.toLowerCase().includes(q)));
    append(results, [matches.length
      ? h('div', { class: 'venue-list' }, matches.map((v) => h('button', { type: 'button', class: 'venue-option', 'aria-pressed': f.location?.venueId === v.id, onClick: () => pick(v) },
          h('strong', {}, v.name), h('small', {}, `${v.area}, ${v.sportIds.map((id) => getSport(id)!.name).join(', ')}`))))
      : h('p', { class: 'muted' }, 'No venues match. Click the map to drop your own pin.')]);
  }

  function where(): HTMLElement {
    const venue = f.location?.venueId ? getVenue(f.location.venueId) : undefined;
    const pins: MapPin[] = venues.map((v) => ({ id: `v:${v.id}`, lat: v.lat, lng: v.lng, label: v.name, variant: 'venue' }));
    if (f.location && !f.location.venueId) pins.push({ id: 'draft', lat: f.location.lat, lng: f.location.lng, label: 'Your pin', variant: 'draft' });
    handle.setPins(pins, f.location?.venueId ? `v:${f.location.venueId}` : f.location ? 'draft' : null);
    fillResults();
    return h('section', { class: 'card sticky-col', 'aria-labelledby': 'where-h' },
      h('h2', { id: 'where-h' }, 'Where'),
      handle.el,
      h('label', { class: 'search-field' }, h('span', { class: 'sr-only' }, 'Search venues'), uiIcon('search'), searchInput),
      results,
      h('p', { class: 'field__hint' }, 'Search for a venue, click a pin, or click anywhere on the map to drop your own pin.'),
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
      h('div', { class: 'cols cols--create' },
        h('div', { class: 'create-form' },
          h('section', { class: 'card' }, h('h2', {}, 'What and when'),
            h('div', { class: 'field' },
              h('label', { class: 'field__label', for: 'sport-select' }, 'Sport'),
              h('div', { class: 'input-row' },
                h('select', { class: 'select', id: 'sport-select', value: f.sportId, dataset: { key: 'sport' }, onChange: (e: Event) => { f.sportId = (e.target as HTMLSelectElement).value; draw(); } },
                  sports.map((s) => h('option', { value: s.id }, s.name))),
                iconButton('help', `About ${getSport(f.sportId)!.name}`, () => openSportInfo(f.sportId), 'icon-btn--tight'))),
            h('div', { class: 'field-row' },
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Date'), h('input', { class: 'input', type: 'date', value: f.date, min: dateStr(new Date()), dataset: { key: 'date' }, onInput: onTime('date'), onChange: onTime('date') })),
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Starts'), h('input', { class: 'input', type: 'time', value: f.start, dataset: { key: 'start' }, onInput: onTime('start'), onChange: onTime('start') })),
              h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Ends'), h('input', { class: 'input', type: 'time', value: f.end, dataset: { key: 'end' }, onInput: onTime('end'), onChange: onTime('end') }))),
            conflictEl,
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
              h('textarea', { class: 'textarea', value: f.notes, placeholder: 'Anything people should know before they come', dataset: { key: 'notes' }, onInput: (e: Event) => { f.notes = (e.target as HTMLTextAreaElement).value; } })))),
        where(),
        h('div', { class: 'create-actions' },
          h('button', { class: 'btn btn--primary', type: 'button', onClick: () => submit() }, 'Create invite'),
          h('a', { class: 'btn btn--secondary', href: '#/home' }, 'Cancel'))),
    ]);
    handle.map.invalidateSize(); });
    if (scrollToError) document.getElementById('form-error')?.scrollIntoView?.({ block: 'center' });
  }

  draw();
  refreshConflict();
  return root;
}
