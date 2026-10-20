import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SMS_SENDER, type ConsoleSmsSender } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { publishedTalent, type Track } from './support/fixtures';
import { cleanupLifecycle, confirmedBooking, future, type Ctx } from './support/lifecycle';
import { staffSession } from './support/staff';

type Session = { userId: string; token: string };
let ctx: Ctx;
let accounts: Session, ops: Session;
const emails: string[] = [];
const track: Track = { talentIds: [], repIds: [], phones: [] };
const http = () => request(ctx.app.getHttpServer());
const auth = (s: { token: string }) => ({ Authorization: `Bearer ${s.token}` });
const move = (leadId: string, body: object) => http().post(`/v1/admin/leads/${leadId}/transition`).set(auth(ctx.sales)).send(body);
let slug: string;

beforeAll(async () => {
  const app = await bootTestApp();
  const prisma = app.get(PrismaService);
  const run = randomUUID().slice(0, 8);
  const [sales, manager, acc, op] = await Promise.all([staffSession(app, ['SALES'], emails), staffSession(app, ['TALENT_MANAGER'], emails), staffSession(app, ['ACCOUNTS'], emails), staffSession(app, ['OPS'], emails)]);
  ctx = { app, prisma, sms: app.get<ConsoleSmsSender>(SMS_SENDER), sales, manager, run, track };
  accounts = acc;
  ops = op;
  slug = (await publishedTalent(prisma, 'settle', run, track)).slug;
});

afterAll(async () => {
  await cleanupLifecycle(ctx, emails);
  await ctx.app.close();
});

describe('ops, settlement and analytics (T-240..T-244)', () => {
  let b: Awaited<ReturnType<typeof confirmedBooking>>;
  let payoutId: string;

  beforeAll(async () => {
    b = await confirmedBooking(ctx, slug);
  });

  it('ops keep a checklist per booking', async () => {
    const checklist = { travel: { status: 'ARRANGED', details: '6E 123, 14:05' }, hotel: { status: 'ARRANGED', details: 'Vivanta, 2 rooms' }, groundTransport: { status: 'PENDING' }, rider: { status: 'NOT_NEEDED' }, reportingTime: '17:30', pointOfContact: { name: 'Manab Das', phone: '9864012345' } };
    await http().put(`/v1/admin/bookings/${b.bookingId}/ops`).set(auth(accounts)).send(checklist).expect(403);
    await http().put(`/v1/admin/bookings/${b.bookingId}/ops`).set(auth(ops)).send({ ...checklist, reportingTime: '25:00' }).expect(400);
    const w = (await http().put(`/v1/admin/bookings/${b.bookingId}/ops`).set(auth(ops)).send(checklist).expect(200)).body.data;
    expect(w.bookings[0].opsChecklist).toMatchObject({ reportingTime: '17:30', groundTransport: { status: 'PENDING', details: null }, pointOfContact: { name: 'Manab Das', phone: '9864012345' } });
  });

  it('completing the event creates the payout for the contracted amount', async () => {
    await move(b.leadId, { to: 'EVENT_COMPLETED' }).expect(200);
    const p = await ctx.prisma.payout.findUniqueOrThrow({ where: { bookingId: b.bookingId } });
    expect(p).toMatchObject({ amountPaise: 38_000_000n, status: 'PENDING' });
    payoutId = p.id;
    expect((await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.bookingId } })).completedAt).toEqual(expect.any(Date));
  });

  it('accounts schedule, adjust (with a reason) and pay; others can only look', async () => {
    const list = (await http().get('/v1/admin/payouts?status=PENDING').set(auth(ctx.manager)).expect(200)).body;
    expect(list.data.find((x: { id: string }) => x.id === payoutId)).toMatchObject({ amountPaise: '38000000', contractedPaise: '38000000', bookingRef: b.ref });
    await http().get('/v1/admin/payouts').set(auth(ctx.sales)).expect(403);
    await http().post(`/v1/admin/payouts/${payoutId}/schedule`).set(auth(ctx.manager)).send({ scheduledFor: future(5) }).expect(403);

    await http().post(`/v1/admin/payouts/${payoutId}/schedule`).set(auth(accounts)).send({ scheduledFor: '2020-01-01' }).expect(400);
    expect((await http().post(`/v1/admin/payouts/${payoutId}/schedule`).set(auth(accounts)).send({ scheduledFor: future(5) }).expect(200)).body.data).toMatchObject({ status: 'SCHEDULED', scheduledFor: future(5) });
    await http().patch(`/v1/admin/payouts/${payoutId}`).set(auth(accounts)).send({ amountPaise: '37500000' }).expect(400); // reason required
    expect((await http().patch(`/v1/admin/payouts/${payoutId}`).set(auth(accounts)).send({ amountPaise: '37500000', note: 'Agreed ₹5,000 deduction for late arrival' }).expect(200)).body.data).toMatchObject({ amountPaise: '37500000', contractedPaise: '38000000' });
  });

  it('closing waits for every payment and the payout; paying the payout stores the final margin', async () => {
    expect((await move(b.leadId, { to: 'SETTLEMENT' }).expect(409)).body.error.code).toBe('COMPLETION_NOTE_REQUIRED');
    await move(b.leadId, { to: 'SETTLEMENT', completionNote: 'Show ran on time; great crowd' }).expect(200);
    expect((await move(b.leadId, { to: 'CLOSED' }).expect(409)).body.error.code).toBe('SETTLEMENT_INCOMPLETE');

    await http().post(`/v1/admin/payouts/${payoutId}/paid`).set(auth(accounts)).send({ reference: 'NEFT-998877', paidOn: future(3) }).expect(400);
    const paid = (await http().post(`/v1/admin/payouts/${payoutId}/paid`).set(auth(accounts)).send({ reference: 'NEFT-998877', paidOn: future(0) }).expect(200)).body.data;
    expect(paid).toMatchObject({ status: 'PAID', reference: 'NEFT-998877', paidAt: expect.any(String) });
    // Final margin = pre-tax subtotal ₹5.5L − actual payout ₹3.75L − internal cost ₹0.
    expect((await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.bookingId } })).marginPaise).toBe(17_500_000n);
    await http().post(`/v1/admin/payouts/${payoutId}/paid`).set(auth(accounts)).send({ reference: 'NEFT-1', paidOn: future(0) }).expect(409);

    expect((await move(b.leadId, { to: 'CLOSED' }).expect(409)).body.error.code).toBe('SETTLEMENT_INCOMPLETE'); // balance still unpaid
    await http().post(`/v1/admin/milestones/${b.balance.id}/payments`).set(auth(accounts)).send({ amountPaise: b.balance.amountPaise.toString(), method: 'bank_transfer', reference: 'UTR-55443322', receivedOn: future(0) }).expect(201);
    expect((await move(b.leadId, { to: 'CLOSED' }).expect(200)).body.data.stage).toBe('CLOSED');
  });

  it('cancellation records the reason and policy, closes what is open and flags received money for a refund review', async () => {
    const c = await confirmedBooking(ctx, slug);
    expect((await move(c.leadId, { to: 'CANCELLED' }).expect(409)).body.error.code).toBe('REASON_REQUIRED');
    await move(c.leadId, { to: 'CANCELLED', reason: 'Event called off by the family', policyRef: 'Contract §7.2 (31–60 days)' }).expect(200);
    const bk = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: c.bookingId }, include: { milestones: { orderBy: { dueDate: 'asc' } }, contracts: true } });
    expect(bk).toMatchObject({ cancelReason: 'Event called off by the family', cancelPolicyRef: 'Contract §7.2 (31–60 days)', cancelledAt: expect.any(Date) });
    expect(bk.milestones.map((m) => m.status)).toEqual(['PAID', 'CANCELLED']);
    expect(bk.contracts[0]!.status).toBe('SIGNED'); // a signed contract stays as evidence
    const review = await ctx.prisma.activity.findFirstOrThrow({ where: { leadId: c.leadId, type: 'refund_review' } });
    expect(review.meta).toMatchObject({ paidPaise: c.advance.amountPaise.toString(), policyRef: 'Contract §7.2 (31–60 days)' });
  });

  it('analytics: pipeline numbers for staff, money details for finance only', async () => {
    const q = `ownerId=${ctx.sales.userId}`;
    const staff = (await http().get(`/v1/admin/analytics?${q}`).set(auth(ops)).expect(200)).body.data;
    expect(staff).toMatchObject({
      leads: 2,
      bookingsConfirmed: 1, // the cancelled one no longer counts
      gmvPaise: '64900000',
      avgBookingValuePaise: '64900000',
      conversion: { enquiryToQuoteBps: 10_000, quoteToConfirmedBps: 10_000 },
    });
    expect(staff.leadsByStage).toMatchObject({ CLOSED: 1, CANCELLED: 1, NEW: 0 });
    expect(staff.avgHoursToConfirm).toEqual(expect.any(Number));
    expect(staff).not.toHaveProperty('finance');

    const fin = (await http().get(`/v1/admin/analytics?${q}`).set(auth(accounts)).expect(200)).body.data;
    expect(fin.finance).toEqual({ marginPaise: '17500000', receivablesPaise: '0', overduePaise: '0', pendingPayouts: { count: 0, amountPaise: '0' } });

    expect((await http().get(`/v1/admin/analytics?${q}&from=2001-01-01&to=2001-12-31`).set(auth(ops)).expect(200)).body.data.leads).toBe(0);
    await http().get('/v1/admin/analytics?city=atlantis').set(auth(ops)).expect(400);
  });
});
