// Real map of Greater Victoria using Leaflet. Tile provider settings live in tiles.ts (needs internet for the tiles).
// Pins are HTML buttons placed by Leaflet, so they keep their look and keyboard access.
import * as L from 'leaflet';
import { h } from '../dom';
import { sportIcon } from './sportBits';
import { ATTRIBUTION, TILE_OPTIONS, TILES } from './tiles';
import type { LatLng } from '../types';

export interface MapPin { id: string; lat: number; lng: number; label: string; glyph?: string; iconSport?: string; count?: number; variant?: 'friends' | 'match' | 'venue' | 'draft' }
export interface MapOptions {
  key: string;                       // slot name; a previous map with the same key is destroyed
  pins: MapPin[];
  selectedId?: string | null;
  center?: LatLng; zoom?: number;
  fitTo?: LatLng[]; maxZoom?: number; // zoom to fit these points (used by the Home mini-map)
  user?: LatLng;                      // draws the "you are here" dot
  interactive?: boolean;              // false = a picture-like map (Home)
  remember?: boolean;                 // restore last pan/zoom for this key
  onSelect?: (id: string) => void;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}
export interface MapHandle {
  el: HTMLElement; map: L.Map;
  setPins: (pins: MapPin[], selectedId?: string | null) => void;
  focus: (id: string, bounce?: boolean) => void;    // centre on a pin and make it bounce
}

const VICTORIA: LatLng = { lat: 48.4284, lng: -123.3656 };
const BOUNDS = L.latLngBounds([48.30, -123.62], [48.60, -123.12]);
const live = new Map<string, L.Map>();
const saved = new Map<string, { c: L.LatLng; z: number }>();
export function destroyMaps(): void { live.forEach((m) => m.remove()); live.clear(); }

export function mapWidget(o: MapOptions): MapHandle {
  live.get(o.key)?.remove();
  const interactive = o.interactive !== false;
  const el = h('div', { class: `map ${o.onPick ? 'map--pick' : ''} ${o.className ?? ''}`.trim() });
  const map = L.map(el, {
    zoomControl: false, dragging: interactive, touchZoom: interactive, doubleClickZoom: interactive,
    scrollWheelZoom: interactive, boxZoom: interactive, keyboard: interactive,
    maxBounds: BOUNDS, maxBoundsViscosity: 0.8, minZoom: 11, maxZoom: 18,
  });
  live.set(o.key, map);
  map.attributionControl.setPrefix(false);
  const dark = document.documentElement.dataset.theme === 'dark';
  L.tileLayer(dark ? TILES.dark : TILES.light, { ...TILE_OPTIONS, attribution: ATTRIBUTION }).addTo(map);

  const restored = o.remember ? saved.get(o.key) : undefined;
  const start = o.center ?? o.user ?? VICTORIA;
  map.setView(restored?.c ?? [start.lat, start.lng], restored?.z ?? o.zoom ?? 13, { animate: false });
  const fit = () => {
    if (!o.fitTo?.length) return;
    map.fitBounds(L.latLngBounds(o.fitTo.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [32, 32], maxZoom: o.maxZoom ?? 15, animate: false });
  };
  if (!restored) fit();
  if (interactive) L.control.zoom({ position: 'bottomleft' }).addTo(map);
  if (o.remember) map.on('moveend', () => saved.set(o.key, { c: map.getCenter(), z: map.getZoom() }));

  if (o.user) {   // "you are here": a blue dot with a soft halo (plain HTML, so it works everywhere)
    const you = h('div', { class: 'you-are-here', 'aria-hidden': 'true' }, h('span', { class: 'you-are-here__halo' }), h('span', { class: 'you-are-here__dot' }));
    L.marker([o.user.lat, o.user.lng], {
      icon: L.divIcon({ className: 'pin-host', html: you as unknown as string, iconSize: [0, 0], iconAnchor: [0, 0] }),
      interactive: false, keyboard: false, zIndexOffset: -1000,
    }).addTo(map);
  }

  // The container has no size until it is in the page. Anything that needs a real size (fitting, flying)
  // waits here until the browser has measured it. Without ResizeObserver we just assume it is ready.
  let sized = typeof ResizeObserver === 'undefined';
  const whenSized: (() => void)[] = [];
  const onSized = (fn: () => void) => { if (sized) fn(); else whenSized.push(fn); };
  if (typeof ResizeObserver !== 'undefined') {
    let first = true;
    const ro = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      map.invalidateSize();
      if (first) { first = false; if (!restored) fit(); sized = true; whenSized.splice(0).forEach((fn) => fn()); }
    });
    ro.observe(el);
    map.on('unload', () => ro.disconnect());
  }

  const layer = L.layerGroup().addTo(map);
  const markers = new Map<string, L.Marker>();
  function setPins(pins: MapPin[], selectedId: string | null = null): void {
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.key;
    layer.clearLayers(); markers.clear();
    for (const p of pins) {
      const selected = p.id === selectedId;
      const btn = h('button', {
        type: 'button', class: ['pin', p.variant ? `pin--${p.variant}` : '', (p.count ?? 1) > 1 ? 'pin--group' : '', selected ? 'pin--selected' : ''].join(' ').trim(),
        'aria-label': p.label, 'aria-pressed': selected, title: p.label, tabindex: o.onSelect ? 0 : -1, dataset: { key: `pin-${p.id}` },
      }, p.iconSport ? sportIcon(p.iconSport, 'pin__icon') : (p.glyph ?? ''));
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: 'pin-host', html: btn as unknown as string, iconSize: [0, 0], iconAnchor: [0, 0] }),
        keyboard: false, interactive: !!o.onSelect, zIndexOffset: selected ? 1000 : p.variant === 'venue' ? -500 : 0,
      });
      marker.on('click', () => o.onSelect?.(p.id));
      marker.addTo(layer);
      markers.set(p.id, marker);
    }
    if (focusKey) (el.querySelector(`[data-key="${focusKey}"]`) as HTMLElement | null)?.focus();
  }
  function focus(id: string, bounce = true): void {
    onSized(() => {
      const m = markers.get(id);
      if (!m) return;
      const target = m.getLatLng();
      const zoom = Math.max(map.getZoom(), 15);
      // flyTo divides by the map size, so a 0x0 map gives NaN and throws. Jump instead in that case.
      if (map.getSize().x > 0 && map.getSize().y > 0) map.flyTo(target, zoom, { duration: 0.7 });
      else map.setView(target, zoom, { animate: false });
      if (!bounce) return;
      setTimeout(() => {
        const pin = m.getElement()?.querySelector('.pin');
        if (!pin) return;
        pin.classList.remove('pin--bounce');
        void (pin as HTMLElement).offsetWidth;   // restart the animation
        pin.classList.add('pin--bounce');
        setTimeout(() => pin.classList.remove('pin--bounce'), 2000);
      }, 700);
    });
  }

  if (o.onPick) map.on('click', (e: L.LeafletMouseEvent) => o.onPick!(Math.round(e.latlng.lat * 1e5) / 1e5, Math.round(e.latlng.lng * 1e5) / 1e5));
  setPins(o.pins, o.selectedId ?? null);
  return { el, map, setPins, focus };
}
