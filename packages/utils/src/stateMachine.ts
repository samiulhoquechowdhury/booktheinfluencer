/**
 * Lead / booking state machine (trd.md §5, srs PIPE-1..5, AVL-3, OPS-5). The only place stage
 * rules live: services call `assertLeadTransition` / `assertAvailabilityChange` and never set
 * `stage` or `availability` directly (rules.md §0.1, §3).
 *
 * Status lists mirror packages/schemas (LEAD_STAGES, AVAILABILITY_STATUSES); a test in apps/web
 * fails if they drift.
 */

export const LEAD_STAGES = [
  'NEW',
  'CONTACTED',
  'REQUIREMENT_RECEIVED',
  'SHORTLISTED',
  'AVAILABILITY_CHECK',
  'QUOTE_SENT',
  'NEGOTIATION',
  'ADVANCE_PENDING',
  'CONFIRMED',
  'EVENT_COMPLETED',
  'SETTLEMENT',
  'CLOSED',
  'LOST',
  'CANCELLED',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const AVAILABILITY_STATUSES = ['NOT_CHECKED', 'AWAITING_MANAGER', 'HOLD_REQUESTED', 'AVAILABLE', 'TENTATIVE', 'UNAVAILABLE', 'CONFIRMED'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export type QuoteStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED';
export type ContractStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'VOID';
export type MilestoneStatus = 'PENDING' | 'LINK_SENT' | 'PAID' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
export type PayoutStatus = 'PENDING' | 'SCHEDULED' | 'PAID' | 'ON_HOLD';

/** Terminal stages: nothing moves out of them. */
export const TERMINAL_STAGES: readonly LeadStage[] = ['CLOSED', 'LOST', 'CANCELLED'];

/** Allowed next stages (trd §5 table). */
export const LEAD_TRANSITIONS: Record<LeadStage, readonly LeadStage[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['REQUIREMENT_RECEIVED', 'LOST'],
  REQUIREMENT_RECEIVED: ['SHORTLISTED', 'LOST'],
  SHORTLISTED: ['AVAILABILITY_CHECK', 'LOST'],
  AVAILABILITY_CHECK: ['QUOTE_SENT', 'SHORTLISTED', 'LOST'],
  QUOTE_SENT: ['NEGOTIATION', 'ADVANCE_PENDING', 'LOST'],
  NEGOTIATION: ['QUOTE_SENT', 'ADVANCE_PENDING', 'LOST'],
  ADVANCE_PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['EVENT_COMPLETED', 'CANCELLED'],
  EVENT_COMPLETED: ['SETTLEMENT'],
  SETTLEMENT: ['CLOSED'],
  CLOSED: [],
  LOST: [],
  CANCELLED: [],
};

/** What a guard needs to know about one booking on the lead. */
export type BookingFacts = {
  talentId: string | null;
  availability: AvailabilityStatus;
  /** Statuses of the booking's quote versions (any order). */
  quoteStatuses: readonly QuoteStatus[];
  contractStatus: ContractStatus | null;
  /** The advance milestone's status; null when no milestone plan exists yet. */
  advanceStatus: MilestoneStatus | null;
  /** Statuses of every payment milestone (advance + balance). */
  milestoneStatuses: readonly MilestoneStatus[];
  repAcceptedAt: Date | string | null;
  payoutStatus: PayoutStatus | null;
};

export type TransitionContext = {
  /** Staff action, or the confirmation handler ("system"). */
  actor: 'user' | 'system';
  ownerId: string | null;
  bookings: readonly BookingFacts[];
  /** Required for LOST (PIPE-5) and CANCELLED (OPS-5). */
  reason?: string | null;
  /** Required for EVENT_COMPLETED → SETTLEMENT. */
  completionNote?: string | null;
};

export type TransitionErrorCode =
  | 'TERMINAL_STAGE'
  | 'TRANSITION_NOT_ALLOWED'
  | 'SYSTEM_ONLY'
  | 'OWNER_REQUIRED'
  | 'TALENT_REQUIRED'
  | 'AVAILABILITY_REQUIRED'
  | 'QUOTE_NOT_SENT'
  | 'QUOTE_NOT_ACCEPTED'
  | 'NOT_CONFIRMABLE'
  | 'REASON_REQUIRED'
  | 'COMPLETION_NOTE_REQUIRED'
  | 'SETTLEMENT_INCOMPLETE';

export type TransitionResult = { ok: true } | { ok: false; code: TransitionErrorCode; message: string };

/** Domain error for the API's global filter → `{ error: { code, message } }` (rules.md §3). */
export class StageTransitionError extends Error {
  constructor(
    readonly code: TransitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StageTransitionError';
  }
}

const fail = (code: TransitionErrorCode, message: string): TransitionResult => ({ ok: false, code, message });
const blank = (s: string | null | undefined) => !s || !s.trim();

/** The four confirmation conditions (trd §5); returns which are still missing for one booking. */
export function confirmationGaps(b: BookingFacts): string[] {
  const gaps: string[] = [];
  if (!b.quoteStatuses.includes('ACCEPTED')) gaps.push('quote accepted');
  if (b.contractStatus !== 'SIGNED') gaps.push('contract signed');
  if (b.advanceStatus !== 'PAID') gaps.push('advance paid');
  if (!b.repAcceptedAt) gaps.push('representative accepted');
  return gaps;
}

/** True when every confirmation condition holds — the only path to CONFIRMED. */
export const isConfirmable = (b: BookingFacts) => confirmationGaps(b).length === 0;

/** Check a lead stage change without throwing. */
export function canTransitionLead(from: LeadStage, to: LeadStage, ctx: TransitionContext): TransitionResult {
  if (TERMINAL_STAGES.includes(from)) return fail('TERMINAL_STAGE', `${from} is final; the lead can't move.`);
  if (!LEAD_TRANSITIONS[from].includes(to)) return fail('TRANSITION_NOT_ALLOWED', `A lead can't move from ${from} to ${to}.`);

  const { bookings } = ctx;
  switch (to) {
    case 'LOST':
    case 'CANCELLED':
      return blank(ctx.reason) ? fail('REASON_REQUIRED', `Give a reason before marking the lead ${to === 'LOST' ? 'lost' : 'cancelled'}.`) : { ok: true };
    case 'CONTACTED':
      return ctx.ownerId ? { ok: true } : fail('OWNER_REQUIRED', 'Assign an owner before contacting the customer.');
    case 'SHORTLISTED':
      if (from === 'AVAILABILITY_CHECK') return { ok: true }; // back to the shortlist
      return bookings.some((b) => b.talentId) ? { ok: true } : fail('TALENT_REQUIRED', 'Add at least one talent before shortlisting.');
    case 'QUOTE_SENT':
      if (from === 'AVAILABILITY_CHECK' && !bookings.some((b) => b.availability === 'AVAILABLE' || b.availability === 'TENTATIVE'))
        return fail('AVAILABILITY_REQUIRED', 'At least one talent must be available or tentative before quoting.');
      return bookings.some((b) => b.quoteStatuses.includes('SENT')) ? { ok: true } : fail('QUOTE_NOT_SENT', 'Send a quote to the customer first.');
    case 'NEGOTIATION':
      return bookings.some((b) => b.quoteStatuses.includes('SENT')) ? { ok: true } : fail('QUOTE_NOT_SENT', 'There is no sent quote to negotiate.');
    case 'ADVANCE_PENDING':
      return bookings.some((b) => b.quoteStatuses.includes('ACCEPTED')) ? { ok: true } : fail('QUOTE_NOT_ACCEPTED', 'The customer has not accepted a quote yet.');
    case 'CONFIRMED': {
      // rules.md §0.1: never manual.
      if (ctx.actor !== 'system') return fail('SYSTEM_ONLY', 'Bookings are confirmed automatically once every condition is met.');
      const ready = bookings.find(isConfirmable);
      if (ready) return { ok: true };
      const gaps = bookings.length ? confirmationGaps(bookings[0]!) : ['a booking'];
      return fail('NOT_CONFIRMABLE', `Still waiting for: ${gaps.join(', ')}.`);
    }
    case 'SETTLEMENT':
      return blank(ctx.completionNote) ? fail('COMPLETION_NOTE_REQUIRED', 'Add a completion note before settlement.') : { ok: true };
    case 'CLOSED': {
      const confirmed = bookings.filter((b) => b.availability === 'CONFIRMED');
      const settled = confirmed.length > 0 && confirmed.every((b) => b.payoutStatus === 'PAID' && b.milestoneStatuses.length > 0 && b.milestoneStatuses.every((m) => m === 'PAID'));
      return settled ? { ok: true } : fail('SETTLEMENT_INCOMPLETE', 'Close only after the talent payout and every customer payment are paid.');
    }
    default:
      return { ok: true };
  }
}

/** Throwing variant for services. */
export function assertLeadTransition(from: LeadStage, to: LeadStage, ctx: TransitionContext): void {
  const r = canTransitionLead(from, to, ctx);
  if (!r.ok) throw new StageTransitionError(r.code, r.message);
}

/** Stages a user may pick from the pipeline UI right now (CONFIRMED never offered to staff). */
export function nextLeadStages(from: LeadStage, actor: TransitionContext['actor'] = 'user'): LeadStage[] {
  return LEAD_TRANSITIONS[from].filter((s) => actor === 'system' || s !== 'CONFIRMED');
}

/**
 * Per-booking availability (AVL-1, AVL-3): staff move freely between the working statuses, but
 * CONFIRMED is set only by the system (and only when confirmable), and a confirmed booking's
 * availability is never edited by hand — cancellation goes through the lead.
 */
export function canChangeAvailability(from: AvailabilityStatus, to: AvailabilityStatus, ctx: { actor: 'user' | 'system'; booking?: BookingFacts }): TransitionResult {
  if (from === to) return fail('TRANSITION_NOT_ALLOWED', `Availability is already ${to}.`);
  if (from === 'CONFIRMED') return fail('SYSTEM_ONLY', 'A confirmed booking’s availability can’t be changed by hand.');
  if (to === 'CONFIRMED') {
    if (ctx.actor !== 'system') return fail('SYSTEM_ONLY', 'Availability becomes Confirmed automatically once every condition is met.');
    if (!ctx.booking || !isConfirmable(ctx.booking)) return fail('NOT_CONFIRMABLE', `Still waiting for: ${ctx.booking ? confirmationGaps(ctx.booking).join(', ') : 'booking details'}.`);
  }
  return { ok: true };
}

export function assertAvailabilityChange(from: AvailabilityStatus, to: AvailabilityStatus, ctx: { actor: 'user' | 'system'; booking?: BookingFacts }): void {
  const r = canChangeAvailability(from, to, ctx);
  if (!r.ok) throw new StageTransitionError(r.code, r.message);
}
