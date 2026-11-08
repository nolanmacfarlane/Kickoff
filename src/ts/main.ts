// App entry: router, top tabs, notification badge, theme, and the unsaved-changes guard.
import { startDemoBots } from './bots';
import { destroyMaps } from './components/mapWidget';
import { confirmDialog, go, h, keepFocus, onToast, refreshModal, setTimeFormat } from './dom';
import { getGuard, getRefresher, setGuard, setRefresher } from './nav';
import { currentUser, logNote, subscribe, unreadCount, unreadMessages } from './state';
import * as create from './views/create';
import * as home from './views/home';
import * as map from './views/map';
import * as onboarding from './views/onboarding';
import * as profile from './views/profile';
import * as social from './views/social';

interface Route { render: (args: string[]) => HTMLElement; live: boolean; tab: string; title: string }
// live = re-render when app state changes. The create form and onboarding are not live, so typing is never lost.
const routes: Record<string, Route> = {
  home: { render: () => home.render(), live: true, tab: 'home', title: 'Home' },
  map: { render: map.render, live: true, tab: 'map', title: 'Map' },
  create: { render: () => create.render(), live: false, tab: 'create', title: 'Create invite' },
  social: { render: social.render, live: true, tab: 'social', title: 'Social' },
  profile: { render: profile.render, live: true, tab: 'profile', title: 'Profile' },
};

const app = document.getElementById('app')!;
let mode: 'onboarding' | 'app' | null = null;
let lastPath = '';
let currentHash = location.hash;
let suppress = false;

function parse(): { name: string; args: string[] } {
  const [name, ...args] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  return { name: name in routes ? name : 'home', args };
}

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
/** The theme actually shown. "system" (and signed-out screens) follow the device setting. */
function resolvedTheme(): 'light' | 'dark' {
  const t = currentUser()?.settings.theme ?? 'system';
  return t === 'system' ? (systemDark.matches ? 'dark' : 'light') : t;
}

function updateChrome(): void {
  const me = currentUser();
  document.body.dataset.auth = me ? 'in' : 'out';
  document.documentElement.dataset.theme = resolvedTheme();
  setTimeFormat(me?.settings.timeFormat ?? '12h');
  const badge = document.getElementById('social-badge')!;
  const n = me ? unreadCount(me.id) + (me.settings.notify.messages ? unreadMessages(me.id) : 0) : 0;
  badge.hidden = n === 0;
  badge.textContent = String(n);
  badge.setAttribute('aria-label', `${n} unread updates`);
}

function render(fromState = false): void {
  updateChrome();
  const me = currentUser();
  currentHash = location.hash;
  if (!me) {
    if (mode !== 'onboarding') { mode = 'onboarding'; setGuard(null); document.body.dataset.route = 'onboarding'; document.title = 'Welcome | Kickoff'; app.replaceChildren(onboarding.render()); destroyMaps(); }
    return;
  }
  mode = 'app';
  const { name, args } = parse();
  const route = routes[name];
  const path = `${name}/${args.join('/')}`;
  const scrollY = window.scrollY;
  setGuard(null);          // a screen with a form registers its own guard while it renders
  setRefresher(null);      // ...and a screen that updates itself registers a refresher
  document.body.dataset.route = name;
  let view: HTMLElement;
  try { view = route.render(args); } catch (err) {
    console.error(err);
    view = h('div', { class: 'empty' }, h('h3', {}, 'Something went wrong loading this screen'), h('p', {}, 'Try another tab, or reload the page.'));
  }
  app.replaceChildren(view);
  destroyMaps();           // after the swap, so maps the new view reused (Home mini-map) are kept
  document.title = `${route.title} | Kickoff`;
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) => {
    if (t.dataset.tab === route.tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  if (fromState && path === lastPath) window.scrollTo(0, scrollY);
  else { window.scrollTo(0, 0); if (!fromState) app.focus({ preventScroll: true }); }
  lastPath = path;
}

subscribe(() => {
  const me = currentUser();
  if (!me || mode !== 'app') { render(true); return; }   // sign in / out switches mode
  updateChrome();
  const refresh = getRefresher();
  if (refresh) refresh();                                // the screen updates itself in place (no rebuild)
  else if (routes[parse().name].live) keepFocus(() => render(true));
  refreshModal();
});

window.addEventListener('hashchange', () => {
  if (suppress) { suppress = false; return; }
  const guard = getGuard();
  const target = location.hash;
  if (guard && guard.isDirty() && target !== currentHash) {
    suppress = true; location.hash = currentHash;          // stay put while we ask
    confirmDialog({
      title: 'Unsaved changes', body: 'You have changes on this page that are not saved.',
      actions: [
        { label: 'Keep editing' },
        { label: 'Discard changes', variant: 'danger', onClick: () => { guard.discard(); setGuard(null); go(target); } },
        { label: 'Save and leave', variant: 'primary', onClick: () => { if (guard.save()) go(target); } },
      ],
    });
    return;
  }
  render();
});
// Device switched light/dark: only matters when following the system. Live screens re-render so map tiles swap too.
systemDark.addEventListener('change', () => {
  if ((currentUser()?.settings.theme ?? 'system') !== 'system') return;
  updateChrome();
  if (mode === 'app' && routes[parse().name].live && !getRefresher()) keepFocus(() => render(true));
});
// Closing the tab: browsers only allow their own generic warning.
window.addEventListener('beforeunload', (e) => { if (getGuard()?.isDirty()) { e.preventDefault(); e.returnValue = ''; } });
onToast(logNote);   // every toast also goes in the activity history
startDemoBots();   // demo: fake users accept friend requests and join new invites
render();
