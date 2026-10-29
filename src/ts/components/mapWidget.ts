// The stylized Victoria map. Pins are positioned by percentage so they match the x/y in data.ts.
import { h } from '../dom';

export interface MapPin
{
  id: string; x: number; y: number; label: string; glyph?: string;
  variant?: 'friends' | 'match' | 'venue' | 'draft';
}
export interface MapOptions
{
  pins: MapPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onPick?: (x: number, y: number) => void;   // makes the map clickable for dropping a freeform pin
  hint?: string;
  legend?: boolean;
  className?: string;
}

const SVG = `<svg class="map__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect class="map__water" width="100" height="100"/>
  <path class="map__land" d="M6 20 C10 8,30 6,48 10 C70 6,90 10,96 24 L97 70 C94 84,80 92,60 94 C40 96,20 92,10 82 C4 70,8 40,6 20 Z"/>
  <path class="map__water" d="M56 95 C57 82,60 74,58 64 L63 64 C65 74,63 84,66 95 Z"/>
  <ellipse class="map__park" cx="42" cy="80" rx="12" ry="8"/>
  <ellipse class="map__park" cx="80" cy="28" rx="9" ry="7"/>
  <ellipse class="map__park" cx="88" cy="62" rx="6" ry="5"/>
  <ellipse class="map__park" cx="28" cy="38" rx="6" ry="5"/>
  <path class="map__road" d="M8 45 C30 40,50 58,96 44"/>
  <path class="map__road" d="M45 12 C46 40,40 60,44 94"/>
  <path class="map__road" d="M12 70 C40 66,70 74,95 66"/>
  <path class="map__road" d="M70 10 C72 30,82 45,90 80"/>
</svg>`;

const AREAS = [
  { n: 'Gordon Head', x: 78, y: 16 }, { n: 'Saanich', x: 24, y: 24 }, { n: 'Vic West', x: 18, y: 54 },
  { n: 'Downtown', x: 50, y: 42 }, { n: 'Oak Bay', x: 86, y: 74 }, { n: 'James Bay', x: 30, y: 88 },
];

export function mapWidget(o: MapOptions): HTMLElement
{
  const el = h('div', { class: `map ${o.onPick ? 'map--pick' : ''} ${o.className ?? ''}`.trim() });
  el.innerHTML = SVG;
  AREAS.forEach((a) => el.append(h('span', { class: 'map__area', style: `left:${a.x}%;top:${a.y}%` }, a.n)));

  for (const p of o.pins)
  {
    const selected = p.id === o.selectedId;
    el.append(h('button', {
      type: 'button',
      class: ['pin', p.variant ? `pin--${p.variant}` : '', selected ? 'pin--selected' : ''].join(' ').trim(),
      style: `left:${p.x}%;top:${p.y}%`,
      'aria-label': p.label, 'aria-pressed': selected, title: p.label, dataset: { key: `pin-${p.id}`, pin: p.id },
      onClick: (e: Event) => { e.stopPropagation(); o.onSelect?.(p.id); },
    }, p.glyph ?? ''));
  }

  if (o.onPick)
  {
    el.addEventListener('click', (e) =>
    {
      if ((e.target as HTMLElement).closest('.pin')) return;
      const r = el.getBoundingClientRect();
      o.onPick!(Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, Math.round(((e.clientY - r.top) / r.height) * 1000) / 10);
    });
  }
  if (o.hint) el.append(h('div', { class: 'map__hint' }, o.hint));
  if (o.legend) el.append(h('div', { class: 'map__legend' }, h('span', {}, 'Open to everyone'), h('span', { class: 'is-friends' }, 'Friends only'), h('span', { class: 'is-match' }, 'Matches you')));
  return el;
}
