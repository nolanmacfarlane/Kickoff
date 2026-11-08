// Messages: direct messages with friends and one group chat per invite. Chat list on the left, conversation on the right.
import { socialNav } from '../components/socialNav';
import { sportIcon, uiIcon } from '../components/sportBits';
import { avatar, dayLabel, firstName, fmtAgo, fmtTime, fmtWhen, h, tag, toast } from '../dom';
import { chatSummaries, currentUser, getInvite, getSport, getUser, markChatRead, messagesIn, sendMessage } from '../state';
import type { ChatSummary } from '../types';
import { openInvite } from './inviteDetail';

const drafts = new Map<string, string>();   // unsent text per chat, so a re-render never loses what you typed

function describe(c: ChatSummary): { title: string; sub: string } {
  if (c.kind === 'direct') { const f = getUser(c.friendId!)!; return { title: f.name, sub: `Friend, ${f.area}` }; }
  const inv = getInvite(c.inviteId!)!;
  return { title: `${getSport(inv.sportId)!.name} at ${inv.location.label}`, sub: fmtWhen(inv.start, inv.end) };
}

export function render(args: string[]): HTMLElement {
  const me = currentUser()!;
  const chats = chatSummaries(me.id);
  const wantedId = args[0] ?? chats[0]?.id ?? null;
  const selected = chats.find((c) => c.id === wantedId) ?? null;

  const preview = (c: ChatSummary): string => {
    if (!c.last) return 'No messages yet';
    if (c.last.senderId === null) return c.last.text;
    const own = c.last.senderId === me.id;
    return own ? `You: ${c.last.text}` : c.kind === 'invite' ? `${firstName(getUser(c.last.senderId)!.name)}: ${c.last.text}` : c.last.text;
  };

  const list = h('nav', { class: 'chat-list card', 'aria-label': 'Conversations' }, chats.length
    ? chats.map((c) => {
        const d = describe(c);
        return h('a', { class: 'chat-item', href: `#/social/messages/${c.id}`, 'aria-current': c.id === selected?.id ? 'page' : null },
          c.kind === 'direct' ? avatar(getUser(c.friendId!)!) : h('span', { class: 'chat-badge' }, sportIcon(getInvite(c.inviteId!)!.sportId)),
          h('div', { class: 'grow' },
            h('div', { class: 'chat-item__top' }, h('strong', {}, d.title), c.last ? h('time', { class: 'muted' }, fmtAgo(c.last.at)) : null),
            h('p', { class: `chat-item__preview ${c.unread ? 'chat-item__preview--unread' : ''}`.trim() }, preview(c))),
          c.unread ? h('span', { class: 'badge', 'aria-label': `${c.unread} unread` }, String(c.unread)) : null);
      })
    : [h('div', { class: 'empty empty--tight' }, 'Add friends or join an invite to start chatting.')]);

  let pane: HTMLElement;
  if (!selected) {
    pane = h('div', { class: 'card empty' }, h('h3', {}, args[0] ? 'That conversation is not available' : 'No conversations yet'),
      h('p', {}, args[0] ? 'You can message friends, and invites you are in.' : 'Add a friend or join an invite to start one.'));
  } else {
    const d = describe(selected);
    const inv = selected.inviteId ? getInvite(selected.inviteId)! : null;
    const people = (inv ? inv.memberIds : [selected.friendId!]).map((id) => getUser(id)!);   // a direct chat shows only the other person
    const thread = h('div', { class: 'thread', role: 'log', 'aria-live': 'polite', 'aria-label': 'Messages' });
    let lastDay = '';
    const msgs = messagesIn(selected.id);
    if (!msgs.length) thread.append(h('div', { class: 'empty empty--tight thread__empty' }, 'No messages yet. Say hello.'));
    for (const m of msgs) {
      const day = dayLabel(m.at);
      if (day !== lastDay) { thread.append(h('div', { class: 'thread__day' }, day)); lastDay = day; }
      if (m.senderId === null) { thread.append(h('p', { class: 'msg msg--system' }, m.text)); continue; }
      const own = m.senderId === me.id;
      thread.append(h('div', { class: `msg ${own ? 'msg--own' : ''}`.trim() },
        !own && selected.kind === 'invite' ? h('span', { class: 'msg__who' }, getUser(m.senderId)!.name) : null,
        h('p', { class: 'msg__text' }, m.text), h('time', { class: 'msg__time' }, fmtTime(m.at))));
    }

    const input = h('input', { class: 'input', type: 'text', placeholder: 'Write a message', maxlength: 500, 'aria-label': 'Message', value: drafts.get(selected.id) ?? '',
      dataset: { key: 'composer' }, onInput: (e: Event) => { drafts.set(selected.id, (e.target as HTMLInputElement).value); } });
    const composer = selected.readOnly
      ? h('p', { class: 'notice' }, 'This invite has ended, so its chat is read only.')
      : h('form', { class: 'composer', onSubmit: (e: Event) => {
          e.preventDefault();
          const text = input.value;
          drafts.delete(selected.id);                       // clear first: sending re-renders this screen
          const r = sendMessage(selected.id, text);
          if (!r.ok) { drafts.set(selected.id, text); toast(r.error, { tone: 'error' }); }
        } }, input, h('button', { class: 'btn btn--primary', type: 'submit' }, uiIcon('send', 'icon icon--inline'), 'Send'));

    pane = h('section', { class: 'chat-pane card', 'aria-label': `Conversation: ${d.title}` },
      h('div', { class: 'chat-head' },
        h('div', { class: 'avatar-stack' }, people.slice(0, 4).map((u) => avatar(u, 'sm'))),
        h('div', { class: 'grow' }, h('h2', {}, d.title), h('p', { class: 'card__meta' }, inv ? `${d.sub}, ${people.length} people` : d.sub)),
        selected.readOnly ? tag('Ended') : null,
        inv ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => openInvite(inv.id) }, 'View invite') : null),
      thread, composer);
    // After it is on screen: jump to the newest message and mark the chat read (does nothing if already read, so no loop).
    setTimeout(() => { thread.scrollTop = thread.scrollHeight; markChatRead(selected.id); }, 0);
  }

  return h('div', {}, socialNav('messages'), h('div', { class: 'messages' }, list, pane));
}
