import { describe, expect, it } from 'vitest';
import { CustomerBookingSchema, PublicTalentSchema, TalentBookingSchema, TalentPayoutSchema } from '@repo/schemas';
import { CTA_FORBIDDEN } from '@repo/utils';
import { db } from './db';
import { handle, toWire } from './router';
import { toCustomerBooking, toPublicTalent, toTalentBooking, toTalentPayout } from './serializers';

const FORBIDDEN_CUSTOMER = ['internalCostPaise', 'payoutPaise', 'marginPaise', 'approvedBy', 'internal', 'rateCard', 'minimumRate'];
const FORBIDDEN_TALENT = ['sellingPaise', 'marginPaise', 'totalPaise', 'subtotalPaise', 'internalCostPaise'];
const keysDeep = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keysDeep(x)]) : [];

describe('serializers never leak internal fields (rules.md §0.2)', () => {
  it('public talent DTO matches the strict schema and has no rate-card fields', () => {
    for (const t of db().talents) {
      const dto = toWire(toPublicTalent(t));
      expect(() => PublicTalentSchema.parse(dto)).not.toThrow();
      expect(keysDeep(dto)).not.toEqual(expect.arrayContaining(['rateCard', 'minimumRate', 'commissionBps']));
    }
  });

  it('customer booking DTO has no cost, payout or margin', () => {
    for (const b of db().bookings) {
      const dto = toWire(toCustomerBooking(b));
      expect(() => CustomerBookingSchema.parse(dto)).not.toThrow();
      const keys = keysDeep(dto);
      for (const f of FORBIDDEN_CUSTOMER) expect(keys).not.toContain(f);
    }
  });

  it('talent DTOs show payout only — never selling price or margin', () => {
    const p = db().portal;
    for (const b of p.bookings) {
      const dto = toWire(toTalentBooking(b));
      expect(() => TalentBookingSchema.parse(dto)).not.toThrow();
      for (const f of FORBIDDEN_TALENT) expect(keysDeep(dto)).not.toContain(f);
    }
    for (const po of p.payouts) {
      const dto = toWire(toTalentPayout(po));
      expect(() => TalentPayoutSchema.parse(dto)).not.toThrow();
      expect(keysDeep(dto)).not.toContain('marginPaise');
    }
  });

  it('strict schemas reject a leaked field', () => {
    const b = toWire(toCustomerBooking(db().bookings[3]!)) as Record<string, unknown>;
    expect(() => CustomerBookingSchema.parse({ ...b, marginPaise: '1' })).toThrow();
  });

  it('public copy never says "Book Now" or promises instant confirmation', () => {
    const text = JSON.stringify(db().talents.map(toPublicTalent));
    expect(CTA_FORBIDDEN.test(text)).toBe(false);
  });
});

describe('mock API rules', () => {
  it('enforces roles', () => {
    expect(handle({ method: 'GET', path: 'me/bookings', role: 'GUEST' }).status).toBe(401);
    expect(handle({ method: 'GET', path: 'portal/payouts', role: 'CUSTOMER' }).status).toBe(403);
    expect(handle({ method: 'GET', path: 'me/bookings', role: 'TALENT' }).status).toBe(403);
  });

  it('pay intent never changes payment state (rules.md §0.4)', () => {
    const before = JSON.stringify(db().bookings.find((b) => b.ref === 'BK-24003')!.milestones);
    const res = handle({ method: 'POST', path: 'me/bookings/BK-24003/milestones/m_24003_1/pay', role: 'CUSTOMER' });
    expect(res.status).toBe(200);
    expect(JSON.stringify(db().bookings.find((b) => b.ref === 'BK-24003')!.milestones)).toBe(before);
  });

  it('accepting a quote never confirms the booking (rules.md §0.1)', () => {
    const res = handle({ method: 'POST', path: 'me/bookings/BK-24005/quotes/Q-24005-2/decision', role: 'CUSTOMER', body: { action: 'accept' } });
    expect(res.status).toBe(200);
    const b = db().bookings.find((x) => x.ref === 'BK-24005')!;
    expect(b.stage).not.toBe('CONFIRMED');
    expect(b.availability).not.toBe('CONFIRMED');
  });

  it('date filter hides blacked-out talent', () => {
    const date = db().blackouts['jatin-bora']![0]!;
    const res = handle({ method: 'GET', path: 'talents', query: { date, pageSize: '48' }, role: 'GUEST' }) as { body: { items: { slug: string }[] } };
    expect(res.body.items.map((t) => t.slug)).not.toContain('jatin-bora');
  });
});
