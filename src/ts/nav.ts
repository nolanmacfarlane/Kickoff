// Unsaved-changes guard. A screen with an editable form registers one; main.ts asks it before leaving.
export interface LeaveGuard {
  isDirty: () => boolean;
  save: () => boolean;      // returns false if validation failed (stay on the page)
  discard: () => void;
}
let guard: LeaveGuard | null = null;
export const setGuard = (g: LeaveGuard | null): void => { guard = g; };
export const getGuard = (): LeaveGuard | null => guard;

// In-place refresh. A screen that is expensive to rebuild (the Map tab) registers one; when app state changes,
// main.ts calls it instead of re-rendering the whole screen.
let refresher: (() => void) | null = null;
export const setRefresher = (fn: (() => void) | null): void => { refresher = fn; };
export const getRefresher = (): (() => void) | null => refresher;
