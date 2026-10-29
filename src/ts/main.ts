// App entry: router, top tabs, notification badge, user chip. Views never touch location directly except via go().
import { avatar, firstName, h, keepFocus, refreshModal } from './dom';
import { currentUser, subscribe, unreadCount } from './state';
import * as create from './views/create';
import * as home from './views/home';
import * as map from './views/map';
import * as onboarding from './views/onboarding';
import * as profile from './views/profile';
import * as social from './views/social';
import * as sport from './views/sport';

interface Route { render: (args: string[]) => HTMLElement; live: boolean; tab: string | null; title: string }
// live = re-render when app state changes. Forms (create, onboarding) are not live so typing is never lost.
const routes: Record<string, Route> = {
  home: { render: () => home.render(), live: true, tab: 'home', title: 'Home' },
  map: { render: map.render, live: true, tab: 'map', title: 'Map' },
  create: { render: () => create.render(), live: false, tab: 'create', title: 'Create invite' },
  social: { render: () => social.render(), live: true, tab: 'social', title: 'Social' },
  profile: { render: profile.render, live: true, tab: 'profile', title: 'Profile' },
  sport: { render: sport.render, live: false, tab: null, title: 'Sport' },
};

const app = document.getElementById('app')!;
let mode: 'onboarding' | 'app' | null = null;
let lastPath = '';

function parse(): { name: string; args: string[] }
{
  const [name, ...args] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  return { name: name in routes ? name : 'home', args };
}

function updateChrome(): void
{
  const me = currentUser();
  document.body.dataset.auth = me ? 'in' : 'out';
  const chip = document.getElementById('user-chip')!;
  chip.replaceChildren(...(me ? [avatar(me, 'sm'), h('span', {}, firstName(me.name))] : []));
  const badge = document.getElementById('social-badge')!;
  const n = me ? unreadCount(me.id) : 0;
  badge.hidden = n === 0;
  badge.textContent = String(n);
  badge.setAttribute('aria-label', `${n} unread updates`);
}

function render(fromState = false): void
{
  updateChrome();
  const me = currentUser();
  if (!me)
  {
    if (mode !== 'onboarding') { mode = 'onboarding'; document.title = 'Welcome | Pickup'; app.replaceChildren(onboarding.render()); }
    return;
  }
  mode = 'app';
  const { name, args } = parse();
  const route = routes[name];
  const path = `${name}/${args.join('/')}`;
  const scrollY = window.scrollY;
  app.replaceChildren(route.render(args));
  document.title = `${route.title} | Pickup`;
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) =>
  {
    if (t.dataset.tab === route.tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  if (fromState && path === lastPath) window.scrollTo(0, scrollY);
  else { window.scrollTo(0, 0); if (!fromState) app.focus({ preventScroll: true }); }
  lastPath = path;
}

subscribe(() =>
{
  const me = currentUser();
  if (!me || mode !== 'app') { render(true); return; }   // sign in / out switches mode
  updateChrome();
  if (routes[parse().name].live) keepFocus(() => render(true));
  refreshModal();
});
window.addEventListener('hashchange', () => render());
render();
