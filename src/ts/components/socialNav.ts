// Tabs at the top of the Social tab. One row; on narrow screens it scrolls sideways and keeps the active tab in view.
import { h } from '../dom';
import { currentUser, incomingRequests, unreadMessages } from '../state';

export type SocialTab = 'overview' | 'meetups' | 'plans' | 'requests' | 'friends' | 'messages';

export function socialNav(active: SocialTab): HTMLElement {
  const me = currentUser()!;
  const counts: Partial<Record<SocialTab, [number, string]>> = {
    requests: [incomingRequests(me.id).length, 'waiting'],
    messages: [unreadMessages(me.id), 'unread'],
  };
  const tabs: [SocialTab, string, string][] = [
    ['overview', 'Overview', '#/social'],
    ['meetups', 'Meetups', '#/social/meetups'],
    ['plans', "Friends' plans", '#/social/plans'],
    ['requests', 'Requests', '#/social/requests'],
    ['friends', 'Friends', '#/social/friends'],
    ['messages', 'Messages', '#/social/messages'],
  ];
  const nav = h('nav', { class: 'subnav', 'aria-label': 'Social sections' }, tabs.map(([id, label, href]) => {
    const [n, word] = counts[id] ?? [0, ''];
    return h('a', { href, 'aria-current': active === id ? 'page' : null }, label, n ? h('span', { class: 'badge', 'aria-label': `${n} ${word}` }, String(n)) : null);
  }));
  // Once on the page, scroll the row (not the window) so the active tab is visible.
  requestAnimationFrame(() => {
    const cur = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (!cur) return;
    const left = cur.offsetLeft, right = left + cur.offsetWidth;   // .subnav is position: relative, so measured from the row's start
    if (left < nav.scrollLeft) nav.scrollLeft = left;
    else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = right - nav.clientWidth;
  });
  return nav;
}
