// Demo only: a share sheet for an invite. Nothing is actually sent anywhere.
import { closeDialog, confirmDialog, fmtWhen, h, toast } from '../dom';
import { getInvite, getSport } from '../state';

const PLATFORMS = ['Messages', 'WhatsApp', 'Instagram', 'Facebook', 'X', 'Email'];

export function shareInvite(inviteId: string): void {
  const inv = getInvite(inviteId);
  if (!inv) return;
  const done = (message: string) => () => { closeDialog(); toast(message); };
  const body = h('div', { class: 'stack-sm' },
    h('p', { class: 'card__meta' }, `${getSport(inv.sportId)!.name} at ${inv.location.label}, ${fmtWhen(inv.start, inv.end)}`),
    h('div', { class: 'share-link' }, h('span', { class: 'share-link__url' }, `kickoff.example/invite/${inv.id}`),
      h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: done('Link copied (demo only).') }, 'Copy link')),
    h('div', { class: 'share-grid' }, PLATFORMS.map((p) => h('button', { class: 'btn btn--secondary', type: 'button', onClick: done(`Demo only: this would share to ${p}.`) }, p))),
    h('p', { class: 'muted' }, 'Demo only: nothing is actually sent.'));
  confirmDialog({ title: 'Share this invite', body, actions: [{ label: 'Close' }] });
}
