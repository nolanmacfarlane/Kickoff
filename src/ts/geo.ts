// Distance helpers for "2.3 km away" labels.
import type { LatLng, MaxDistance } from './types';

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}

export function fmtDistance(km: number, units: 'km' | 'mi'): string {
  const v = units === 'mi' ? km * 0.621371 : km;
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units}`;
}

/** The "Within ..." choices. Rounder numbers in each unit, so labels read "within 3 mi" rather than "within 3.1 mi". */
export const DISTANCES: Record<'km' | 'mi', Record<Exclude<MaxDistance, 'any'>, number>> = {
  km: { near: 2, mid: 5, far: 10 },
  mi: { near: 1, mid: 3, far: 6 },
};
export function maxDistanceKm(d: MaxDistance, units: 'km' | 'mi'): number | null {
  if (d === 'any') return null;
  const v = DISTANCES[units][d];
  return units === 'mi' ? v / 0.621371 : v;
}
export const distanceLabel = (d: MaxDistance, units: 'km' | 'mi'): string => (d === 'any' ? 'Any distance' : `Within ${DISTANCES[units][d]} ${units}`);
/** Is this point inside the distance limit (or is there no limit)? */
export function withinDistance(from: LatLng, to: LatLng, d: MaxDistance, units: 'km' | 'mi'): boolean {
  const max = maxDistanceKm(d, units);
  return max === null || distanceKm(from, to) <= max;
}
