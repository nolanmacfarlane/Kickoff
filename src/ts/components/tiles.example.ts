// Map tile settings. Copy this file to tiles.ts (which is gitignored) before building:
//   cp src/ts/components/tiles.example.ts src/ts/components/tiles.ts
// If your tile provider needs an API key, tiles.ts is the ONLY file to put it in.
//
// Default: CARTO basemaps (OpenStreetMap data, no key needed). OpenStreetMap's own tile server blocks pages that
// are opened from a file:// folder, so do not point this at tile.openstreetmap.org.
//
// To use another provider, change the two URLs, TILE_OPTIONS and ATTRIBUTION below, e.g. for a provider that
// uses a key:  'https://tiles.example.com/style/{z}/{x}/{y}.png?key=YOUR_KEY'
// API keys in a front-end app are visible to anyone who opens the page, so use a free-tier key, restrict it in
// the provider's dashboard if it allows, and do not commit a real key to a public repository.
export const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
export const TILE_OPTIONS: { subdomains?: string; maxZoom: number } = { subdomains: 'abcd', maxZoom: 19 };
export const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
