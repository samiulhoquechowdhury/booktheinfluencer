import type { CustomerBooking } from '@repo/schemas';
import { daysUntil } from '@repo/utils';

export type NextAction =
  | { kind: 'review_quote'; quoteId: string; title: string; body: string }
  | { kind: 'sign_contract'; title: string; body: string }
  | { kind: 'pay'; milestoneId: string; title: string; body: string; amountPaise: bigint }
  | { kind: 'wait'; title: string; body: string }
  | { kind: 'alternatives'; title: string; body: string }
  | { kind: 'done'; title: string; body: string };

/** What the customer should do next — drives the action card (design.md §6.5). */
export function nextAction(b: CustomerBooking): NextAction {
  const open = b.quotes.find((q) => q.status === 'SENT');
  const accepted = b.quotes.some((q) => q.status === 'ACCEPTED');
  const due = b.milestones.find((m) => m.status === 'DUE' || m.status === 'OVERDUE');

  if (b.availability === 'UNAVAILABLE') {
    return { kind: 'alternatives', title: 'Not available on this date', body: `${b.talent.name} can’t make it. Your manager has shared verified alternatives that fit your brief.` };
  }
  if (open) {
    const left = daysUntil(open.validUntil);
    return { kind: 'review_quote', quoteId: open.id, title: `Review your quote (v${open.version})`, body: left >= 0 ? `Valid for ${left} more ${left === 1 ? 'day' : 'days'}. Accept online or request changes.` : 'This quote has expired.' };
  }
  if (accepted && b.contract.status === 'SENT') {
    return { kind: 'sign_contract', title: 'Sign your contract', body: 'Review and e-sign the booking contract. It protects you and the artist.' };
  }
  if (due && !b.advancePaid) {
    return { kind: 'pay', milestoneId: due.id, amountPaise: due.amountPaise, title: `Pay ${due.label.toLowerCase()}`, body: 'Pay securely via UPI, card or net banking. Your booking is confirmed once the advance clears.' };
  }
  if (b.availability === 'CONFIRMED') {
    return { kind: 'done', title: 'You’re confirmed', body: 'Everything’s in place. Your manager will share the run-of-show closer to the date.' };
  }
  if (accepted && b.contract.status === 'NOT_SENT') {
    return { kind: 'wait', title: 'Contract on its way', body: 'Your manager is preparing the contract. You’ll get an e-sign link by email and WhatsApp.' };
  }
  return { kind: 'wait', title: 'We’re on it', body: 'Your manager is confirming availability with the representative. No action needed yet.' };
}
