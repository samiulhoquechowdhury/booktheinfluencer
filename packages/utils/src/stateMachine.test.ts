import { describe, expect, it } from 'vitest';
import {
  LEAD_STAGES,
  LEAD_TRANSITIONS,
  StageTransitionError,
  TERMINAL_STAGES,
  assertAvailabilityChange,
  assertLeadTransition,
  canChangeAvailability,
  canTransitionLead,
  confirmationGaps,
  nextLeadStages,
  type BookingFacts,
  type LeadStage,
  type TransitionContext,
} from './stateMachine';

const booking = (over: Partial<BookingFacts> = {}): BookingFacts => ({
  talentId: 'tal_1',
  availability: 'NOT_CHECKED',
  quoteStatuses: [],
  contractStatus: null,
  advanceStatus: null,
  milestoneStatuses: [],
  repAcceptedAt: null,
  payoutStatus: null,
  ...over,
});
const ready = booking({ availability: 'AVAILABLE', quoteStatuses: ['SUPERSEDED', 'ACCEPTED'], contractStatus: 'SIGNED', advanceStatus: 'PAID', milestoneStatuses: ['PAID', 'PENDING'], repAcceptedAt: '2026-10-01T10:00:00Z' });
const ctx = (over: Partial<TransitionContext> = {}): TransitionContext => ({ actor: 'user', ownerId: 'u1', bookings: [booking()], ...over });
const code = (from: LeadStage, to: LeadStage, c: TransitionContext) => {
  const r = canTransitionLead(from, to, c);
  return r.ok ? 'OK' : r.code;
};

describe('lead transition table', () => {
  it('covers every stage', () => {
    expect(Object.keys(LEAD_TRANSITIONS).sort()).toEqual([...LEAD_STAGES].sort());
  });

  it('rejects every move not in the table', () => {
    for (const from of LEAD_STAGES) {
      for (const to of LEAD_STAGES) {
        if (LEAD_TRANSITIONS[from].includes(to)) continue;
        expect(code(from, to, ctx({ actor: 'system', bookings: [ready], reason: 'x', completionNote: 'x' }))).toMatch(/TERMINAL_STAGE|TRANSITION_NOT_ALLOWED/);
      }
    }
  });

  it('treats CLOSED, LOST and CANCELLED as final', () => {
    for (const s of TERMINAL_STAGES) {
      expect(LEAD_TRANSITIONS[s]).toEqual([]);
      expect(code(s, 'NEW', ctx())).toBe('TERMINAL_STAGE');
    }
  });

  it('cannot skip ahead (NEW → QUOTE_SENT)', () => {
    expect(code('NEW', 'QUOTE_SENT', ctx())).toBe('TRANSITION_NOT_ALLOWED');
  });
});

describe('guards', () => {
  it('NEW → CONTACTED needs an owner', () => {
    expect(code('NEW', 'CONTACTED', ctx({ ownerId: null }))).toBe('OWNER_REQUIRED');
    expect(code('NEW', 'CONTACTED', ctx())).toBe('OK');
  });

  it('LOST and CANCELLED need a reason (PIPE-5, OPS-5)', () => {
    expect(code('NEW', 'LOST', ctx())).toBe('REASON_REQUIRED');
    expect(code('NEW', 'LOST', ctx({ reason: '   ' }))).toBe('REASON_REQUIRED');
    expect(code('NEW', 'LOST', ctx({ reason: 'Budget too low' }))).toBe('OK');
    expect(code('CONFIRMED', 'CANCELLED', ctx())).toBe('REASON_REQUIRED');
    expect(code('CONFIRMED', 'CANCELLED', ctx({ reason: 'Event postponed' }))).toBe('OK');
  });

  it('SHORTLISTED needs at least one talent', () => {
    expect(code('REQUIREMENT_RECEIVED', 'SHORTLISTED', ctx({ bookings: [booking({ talentId: null })] }))).toBe('TALENT_REQUIRED');
    expect(code('REQUIREMENT_RECEIVED', 'SHORTLISTED', ctx({ bookings: [] }))).toBe('TALENT_REQUIRED');
    expect(code('REQUIREMENT_RECEIVED', 'SHORTLISTED', ctx())).toBe('OK');
    expect(code('AVAILABILITY_CHECK', 'SHORTLISTED', ctx({ bookings: [] }))).toBe('OK');
  });

  it('QUOTE_SENT needs an available/tentative talent and a sent quote', () => {
    expect(code('AVAILABILITY_CHECK', 'QUOTE_SENT', ctx({ bookings: [booking({ availability: 'AWAITING_MANAGER', quoteStatuses: ['SENT'] })] }))).toBe('AVAILABILITY_REQUIRED');
    expect(code('AVAILABILITY_CHECK', 'QUOTE_SENT', ctx({ bookings: [booking({ availability: 'TENTATIVE', quoteStatuses: ['DRAFT'] })] }))).toBe('QUOTE_NOT_SENT');
    expect(code('AVAILABILITY_CHECK', 'QUOTE_SENT', ctx({ bookings: [booking({ availability: 'UNAVAILABLE' }), booking({ availability: 'AVAILABLE', quoteStatuses: ['SENT'] })] }))).toBe('OK');
    expect(code('NEGOTIATION', 'QUOTE_SENT', ctx({ bookings: [booking({ quoteStatuses: ['SUPERSEDED', 'SENT'] })] }))).toBe('OK');
  });

  it('ADVANCE_PENDING needs an accepted quote', () => {
    expect(code('QUOTE_SENT', 'ADVANCE_PENDING', ctx({ bookings: [booking({ quoteStatuses: ['SENT'] })] }))).toBe('QUOTE_NOT_ACCEPTED');
    expect(code('NEGOTIATION', 'ADVANCE_PENDING', ctx({ bookings: [booking({ quoteStatuses: ['ACCEPTED'] })] }))).toBe('OK');
  });

  it('SETTLEMENT needs a completion note', () => {
    expect(code('EVENT_COMPLETED', 'SETTLEMENT', ctx())).toBe('COMPLETION_NOTE_REQUIRED');
    expect(code('EVENT_COMPLETED', 'SETTLEMENT', ctx({ completionNote: 'Show ran 75 min, no issues' }))).toBe('OK');
  });

  it('CLOSED needs the payout and every milestone paid', () => {
    const confirmed = { ...ready, availability: 'CONFIRMED' as const };
    expect(code('SETTLEMENT', 'CLOSED', ctx({ bookings: [{ ...confirmed, payoutStatus: 'SCHEDULED' }] }))).toBe('SETTLEMENT_INCOMPLETE');
    expect(code('SETTLEMENT', 'CLOSED', ctx({ bookings: [{ ...confirmed, payoutStatus: 'PAID', milestoneStatuses: ['PAID', 'PENDING'] }] }))).toBe('SETTLEMENT_INCOMPLETE');
    expect(code('SETTLEMENT', 'CLOSED', ctx({ bookings: [{ ...confirmed, payoutStatus: 'PAID', milestoneStatuses: ['PAID', 'PAID'] }] }))).toBe('OK');
  });
});

describe('confirmation rule (rules.md §0.1)', () => {
  it('never lets staff confirm, even when everything is ready', () => {
    expect(code('ADVANCE_PENDING', 'CONFIRMED', ctx({ actor: 'user', bookings: [ready] }))).toBe('SYSTEM_ONLY');
  });

  it('lets the system confirm only when all four conditions hold', () => {
    expect(code('ADVANCE_PENDING', 'CONFIRMED', ctx({ actor: 'system', bookings: [ready] }))).toBe('OK');
    for (const missing of [{ quoteStatuses: ['SENT'] as const }, { contractStatus: 'PARTIALLY_SIGNED' as const }, { advanceStatus: 'LINK_SENT' as const }, { repAcceptedAt: null }]) {
      expect(code('ADVANCE_PENDING', 'CONFIRMED', ctx({ actor: 'system', bookings: [{ ...ready, ...missing }] }))).toBe('NOT_CONFIRMABLE');
    }
  });

  it('lists what is still missing', () => {
    expect(confirmationGaps(booking())).toEqual(['quote accepted', 'contract signed', 'advance paid', 'representative accepted']);
    expect(confirmationGaps(ready)).toEqual([]);
  });

  it('hides CONFIRMED from the staff stage picker', () => {
    expect(nextLeadStages('ADVANCE_PENDING')).toEqual(['CANCELLED']);
    expect(nextLeadStages('ADVANCE_PENDING', 'system')).toEqual(['CONFIRMED', 'CANCELLED']);
  });

  it('assertLeadTransition throws a coded domain error', () => {
    expect(() => assertLeadTransition('ADVANCE_PENDING', 'CONFIRMED', ctx({ bookings: [ready] }))).toThrow(StageTransitionError);
    try {
      assertLeadTransition('NEW', 'LOST', ctx());
    } catch (e) {
      expect((e as StageTransitionError).code).toBe('REASON_REQUIRED');
    }
    expect(() => assertLeadTransition('NEW', 'CONTACTED', ctx())).not.toThrow();
  });
});

describe('availability (AVL-3)', () => {
  it('staff move between working statuses', () => {
    expect(canChangeAvailability('NOT_CHECKED', 'AWAITING_MANAGER', { actor: 'user' }).ok).toBe(true);
    expect(canChangeAvailability('AVAILABLE', 'UNAVAILABLE', { actor: 'user' }).ok).toBe(true);
  });

  it('only the system sets CONFIRMED, and only when confirmable', () => {
    expect(canChangeAvailability('AVAILABLE', 'CONFIRMED', { actor: 'user', booking: ready })).toMatchObject({ ok: false, code: 'SYSTEM_ONLY' });
    expect(canChangeAvailability('AVAILABLE', 'CONFIRMED', { actor: 'system', booking: { ...ready, contractStatus: 'SENT' } })).toMatchObject({ ok: false, code: 'NOT_CONFIRMABLE' });
    expect(canChangeAvailability('AVAILABLE', 'CONFIRMED', { actor: 'system', booking: ready }).ok).toBe(true);
  });

  it('a confirmed booking is never edited by hand', () => {
    expect(canChangeAvailability('CONFIRMED', 'AVAILABLE', { actor: 'user' })).toMatchObject({ ok: false, code: 'SYSTEM_ONLY' });
    expect(() => assertAvailabilityChange('CONFIRMED', 'UNAVAILABLE', { actor: 'system' })).toThrow(StageTransitionError);
  });
});
