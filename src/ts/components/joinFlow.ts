// Joining an invite, from a card or from the details window. Warns if it overlaps another meetup you are going to.
import { confirmDialog, fmtWhen, toast } from '../dom';
import { acceptInvite, getSport } from '../state';
import type { Invite } from '../types';

export const describeConflicts = (list: Invite[]): string =>
  list.map((i) => `${getSport(i.sportId)!.name} at ${i.location.label} (${fmtWhen(i.start, i.end)})`).join('; ');

export function joinInvite(inviteId: string): void {
  const attempt = (force: boolean): void => {
    const r = acceptInvite(inviteId, Date.now(), force);
    if (r.ok) { toast('You are in. The host and other members have been told.'); return; }
    if (r.conflicts?.length) {
      confirmDialog({
        title: 'This overlaps with another meetup',
        body: `You are already going to ${describeConflicts(r.conflicts)}. Join anyway?`,
        actions: [{ label: 'Cancel' }, { label: 'Join anyway', variant: 'primary', onClick: () => attempt(true) }],
      });
      return;
    }
    toast(r.error);
  };
  attempt(false);
}
