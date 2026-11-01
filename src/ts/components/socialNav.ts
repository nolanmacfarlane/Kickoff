// Overview | Messages switch at the top of the Social tab.
import { h } from '../dom';
import { currentUser, unreadMessages } from '../state';

export function socialNav(active: 'overview' | 'messages'): HTMLElement {
  const unread = unreadMessages(currentUser()!.id);
  return h('nav', { class: 'subnav', 'aria-label': 'Social sections' },
    h('a', { href: '#/social', 'aria-current': active === 'overview' ? 'page' : null }, 'Overview'),
    h('a', { href: '#/social/messages', 'aria-current': active === 'messages' ? 'page' : null }, 'Messages', unread ? h('span', { class: 'badge', 'aria-label': `${unread} unread` }, String(unread)) : null));
}
