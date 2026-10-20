import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CustomerBookingSchema, CustomerDashboardSchema } from '@repo/schemas';
import { ConsoleSmsSender, SMS_SENDER } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { ensureCategory } from './support/fixtures';
import { staffSession } from './support/staff';

type Session = { userId: string; token: string };
let app: NestExpressApplication;
let prisma: PrismaService;
let sms: ConsoleSmsSender;
let sales: Session, manager: Session, accounts: Session, admin: Session, ops: Session;
const run = randomUUID().slice(0, 8);
const emails: string[] = [];
const phones: string[] = [];
const talentIds: string[] = [];
const repIds: string[] = [];
const http = () => request(app.getHttpServer());
const auth = (s: { token: string }) => ({ Authorization: `Bearer ${s.token}` });
const ip = () => `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function talent(key: string) {
  const cat = await ensureCategory(prisma, 'singers', 'Singers');
  const rep = await prisma.representative.create({ data: { name: `Rep ${run}`, phone: '+919000000000' } });
  repIds.push(rep.id);
  const t = await prisma.talent.create({
    data: {
      slug: `${key}-${run}`,
      stageName: `${key} ${run}`,
      tagline: `${key} live`,
      bio: `Bio of ${key}`,
      baseCity: 'guwahati',
      languages: ['Assamese'],
      eventTypes: ['WEDDING'],
      status: 'PUBLISHED',
      representationType: 'PLATFORM_COORDINATED',
      categories: { create: { categoryId: cat.id, isPrimary: true } },
      media: { create: [0, 1, 2, 3].map((i) => ({ key: `/talent/${key}-${i}.jpg`, alt: `${key} photo ${i}`, width: 1200, height: 1500, sortOrder: i, isCover: i === 0 })) },
      reps: { create: { repId: rep.id } },
      // INTERNAL: minimum ₹3L for weddings.
      rateCards: { create: { eventType: 'WEDDING', minimumRatePaise: 300_000_00n, sellingRatePaise: 450_000_00n, commissionBps: 1500 } },
    },
  });
  talentIds.push(t.id);
  return t;
}

/** A customer brief for one talent, moved to availability check with the talent available. */
async function bookingReady(slug: string) {
  const phone = `9${randomInt(100_000_000, 999_999_999)}`;
  phones.push(`+91${phone}`);
  const from = ip();
  await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
  const r = await http()
    .post('/v1/enquiries')
    .set('X-Forwarded-For', from)
    .send({
      event: { eventType: 'WEDDING', date: future(90), city: 'guwahati', venue: 'Vivanta', audienceSize: 400, durationMins: 90 },
      talent: { talentSlugs: [slug], budgetMinRupees: 300_000, budgetMaxRupees: 600_000 },
      contact: { name: 'Riya Sharma', phone, email: `riya-${run}-${phone}@test.local`, otp: sms.lastCode(`+91${phone}`)!, consent: true },
    })
    .expect(201);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { ref: r.body.data.ref }, include: { bookings: true } });
  await prisma.lead.update({ where: { id: lead.id }, data: { stage: 'AVAILABILITY_CHECK', ownerId: sales.userId } });
  await prisma.booking.update({ where: { id: lead.bookings[0]!.id }, data: { availability: 'AVAILABLE' } });
  return { leadId: lead.id, bookingId: lead.bookings[0]!.id, ref: lead.bookings[0]!.ref, customer: { token: r.body.data.session.accessToken as string } };
}

const quote = (o: { fee?: number; payout?: number | null; travelCost?: number; ids?: [string, string]; validUntil?: string } = {}) => ({
  validUntil: o.validUntil ?? future(14),
  lines: [
    { ...(o.ids ? { id: o.ids[0] } : {}), type: 'TALENT_FEE', description: 'Performance, 90 minutes', amountRupees: o.fee ?? 400_000, ...(o.payout !== undefined ? { payoutRupees: o.payout } : {}) },
    { ...(o.ids ? { id: o.ids[1] } : {}), type: 'TRAVEL', description: 'Flights for 4', amountRupees: 50_000, ...(o.travelCost !== undefined ? { internalCostRupees: o.travelCost } : {}) },
  ],
  milestones: [
    { label: 'Advance', percentBps: 3000, dueDate: future(3) },
    { label: 'Balance', percentBps: 7000, dueDate: future(80) },
  ],
  inclusions: ['Sound check', 'Two costume changes'],
  notes: 'Prices include the band.',
});

let aanya: { id: string; slug: string };

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  sms = app.get(SMS_SENDER);
  [sales, manager, accounts, admin, ops] = await Promise.all([
    staffSession(app, ['SALES'], emails),
    staffSession(app, ['TALENT_MANAGER'], emails),
    staffSession(app, ['ACCOUNTS'], emails),
    staffSession(app, ['SUPER_ADMIN'], emails),
    staffSession(app, ['OPS'], emails),
  ]);
  aanya = await talent('aanya');
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { OR: [{ email: { in: emails } }, { phone: { in: phones } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.lead.deleteMany({ where: { OR: [{ customerId: { in: ids } }, { bookings: { some: { talentId: { in: talentIds } } } }] } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { actorId: null, entity: 'booking', action: 'booking.confirmed' }] } });
  await prisma.talent.deleteMany({ where: { id: { in: talentIds } } });
  await prisma.representative.deleteMany({ where: { id: { in: repIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: phones } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await app.close();
});

describe('quotes (T-180..T-182, T-185, T-186)', () => {
  let b: Awaited<ReturnType<typeof bookingReady>>;
  let v1: string;
  let lineIds: [string, string];

  beforeAll(async () => {
    b = await bookingReady(aanya.slug);
  });

  it('validates the builder input', async () => {
    const bad = quote();
    await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send({ ...bad, milestones: [{ label: 'Advance', percentBps: 5000, dueDate: future(3) }] }).expect(400);
    await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send({ ...bad, lines: [bad.lines[1]] }).expect(400);
    await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send(quote({ validUntil: '2020-01-01' })).expect(400);
    await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(ops)).send(quote()).expect(403);
  });

  it('sales drafts a quote but can neither see nor set payout, internal cost or margin', async () => {
    await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send(quote({ payout: 380_000 })).expect(403);
    await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send(quote({ travelCost: 1 })).expect(403);
    const q = (await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send(quote()).expect(201)).body.data;
    v1 = q.id;
    lineIds = [q.lines[0].id, q.lines[1].id];
    expect(q).toMatchObject({ version: 1, status: 'DRAFT', gstBps: 1800, subtotalPaise: '45000000', taxPaise: '8100000', totalPaise: '53100000' });
    expect(q.milestones.map((m: { amountPaise: string }) => m.amountPaise)).toEqual(['15930000', '37170000']);
    const text = JSON.stringify(q);
    for (const k of ['payout', 'internalCost', 'margin']) expect(text).not.toContain(k);

    const hints = (await http().get(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).expect(200)).body.data;
    expect(hints.rateCard).toMatchObject({ eventType: 'WEDDING', minimumRupees: 300_000 });
    expect(hints.marginFloorBps).toBeUndefined();
  });

  it('can’t be sent until the talent payout is entered', async () => {
    expect((await http().post(`/v1/admin/quotes/${v1}/send`).set(auth(sales)).expect(409)).body.error.code).toBe('PAYOUT_MISSING');
  });

  it('talent manager adds the payout and finance the internal cost; hidden values survive other roles’ edits', async () => {
    let q = (await http().put(`/v1/admin/quotes/${v1}`).set(auth(manager)).send(quote({ ids: lineIds, payout: 380_000 })).expect(200)).body.data;
    expect(q.lines[0].payoutPaise).toBe('38000000');
    expect(q).not.toHaveProperty('marginPaise');

    q = (await http().put(`/v1/admin/quotes/${v1}`).set(auth(accounts)).send(quote({ ids: lineIds, travelCost: 40_000 })).expect(200)).body.data;
    expect(q.lines[0].payoutPaise).toBe('38000000'); // kept, not sent
    expect(q).toMatchObject({ internalCostPaise: '4000000', marginPaise: '3000000', marginBps: 666, approval: { reasons: ['MARGIN_BELOW_FLOOR'], approved: false } });

    // A sales edit keeps both hidden values.
    await http().put(`/v1/admin/quotes/${v1}`).set(auth(sales)).send(quote({ ids: lineIds })).expect(200);
    q = (await http().get(`/v1/admin/quotes/${v1}`).set(auth(accounts)).expect(200)).body.data;
    expect(q).toMatchObject({ payoutTotalPaise: '38000000', internalCostPaise: '4000000' });
    await http().put(`/v1/admin/quotes/${v1}`).set(auth(sales)).send(quote({ ids: ['nope', lineIds[1]] })).expect(400);
  });

  it('a thin margin needs SUPER_ADMIN approval, which sends it and moves the lead to QUOTE_SENT', async () => {
    expect((await http().post(`/v1/admin/quotes/${v1}/send`).set(auth(sales)).expect(200)).body.data.status).toBe('PENDING_APPROVAL');
    await http().put(`/v1/admin/quotes/${v1}`).set(auth(sales)).send(quote({ ids: lineIds })).expect(200); // edit returns it to draft
    expect((await http().post(`/v1/admin/quotes/${v1}/send`).set(auth(sales)).expect(200)).body.data.status).toBe('PENDING_APPROVAL');
    await http().post(`/v1/admin/quotes/${v1}/approve`).set(auth(sales)).send({}).expect(403);
    const q = (await http().post(`/v1/admin/quotes/${v1}/approve`).set(auth(admin)).send({ note: 'Repeat client' }).expect(200)).body.data;
    expect(q).toMatchObject({ status: 'SENT', sentAt: expect.any(String), approval: { approved: true } });
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: b.leadId } })).stage).toBe('QUOTE_SENT');
    await http().put(`/v1/admin/quotes/${v1}`).set(auth(sales)).send(quote({ ids: lineIds })).expect(409);
  });

  it('the customer sees exactly the customer DTO — no cost, payout or margin anywhere', async () => {
    await http().patch(`/v1/admin/leads/${b.leadId}/brief`).set(auth(sales)).send({ startTime: '19:30' }).expect(200);
    const res = await http().get(`/v1/me/bookings/${b.ref}`).set(auth(b.customer)).expect(200);
    const booking = CustomerBookingSchema.parse(res.body.data); // strict: an extra field throws
    expect(booking.event.startTime).toBe('19:30');
    expect(booking.quotes).toHaveLength(1);
    expect(booking.quotes[0]).toMatchObject({ version: 1, status: 'SENT', totalPaise: 53_100_000n, inclusions: ['Sound check', 'Two costume changes'] });
    // Field names, plus the payout and the rate-card minimum as unique figures (other internal amounts collide with real prices).
    for (const leak of ['payout', 'internalCost', 'margin', 'rateCard', 'minimum', 'approval', '38000000', '30000000']) expect(res.text).not.toContain(leak);

    const dash = await http().get('/v1/me/bookings').set(auth(b.customer)).expect(200);
    expect(CustomerDashboardSchema.parse(dash.body.data).bookings.map((x) => x.ref)).toEqual([b.ref]);
  });

  it('only the booking’s customer can see or decide on it', async () => {
    const other = await bookingReady(aanya.slug);
    await http().get(`/v1/me/bookings/${b.ref}`).set(auth(other.customer)).expect(404);
    await http().post(`/v1/me/bookings/${b.ref}/quotes/${v1}/decision`).set(auth(other.customer)).send({ action: 'accept' }).expect(404);
    await http().get(`/v1/me/bookings/${b.ref}`).set(auth(sales)).expect(403);
  });

  it('request changes → negotiation; a revised version keeps hidden values and sends without approval', async () => {
    const changed = (await http().post(`/v1/me/bookings/${b.ref}/quotes/${v1}/decision`).set(auth(b.customer)).send({ action: 'request_changes', message: 'Can you do it for 4.5 lakh all in?' }).expect(200)).body.data;
    expect(changed.quotes[0]).toMatchObject({ status: 'CHANGES_REQUESTED', changeRequest: 'Can you do it for 4.5 lakh all in?' });
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: b.leadId } })).stage).toBe('NEGOTIATION');

    const v2 = (await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send(quote({ ids: lineIds, fee: 450_000 })).expect(201)).body.data;
    expect(v2.version).toBe(2);
    const sent = (await http().post(`/v1/admin/quotes/${v2.id}/send`).set(auth(sales)).expect(200)).body.data;
    expect(sent.status).toBe('SENT'); // margin 16%, above the floor and the minimum rate
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: b.leadId } })).stage).toBe('QUOTE_SENT');
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: v1 } })).status).toBe('REJECTED');
  });

  it('accepting records who, when and from where, creates the payment plan and moves to ADVANCE_PENDING', async () => {
    const v2 = await prisma.quote.findFirstOrThrow({ where: { bookingId: b.bookingId, version: 2 } });
    const res = await http().post(`/v1/me/bookings/${b.ref}/quotes/${v2.id}/decision`).set(auth(b.customer)).set('X-Forwarded-For', '10.9.8.7').send({ action: 'accept' }).expect(200);
    const booking = CustomerBookingSchema.parse(res.body.data);
    expect(booking.stage).toBe('ADVANCE_PENDING');
    expect(booking.quotes[0]).toMatchObject({ version: 2, status: 'ACCEPTED', acceptedAt: expect.any(String) });
    expect(booking.milestones.map((m) => m.label)).toEqual(['Advance', 'Balance']);
    expect(booking.milestones.reduce((a, m) => a + m.amountPaise, 0n)).toBe(booking.quotes[0]!.totalPaise);
    expect(booking.activity.map((a) => a.label)).toEqual(expect.arrayContaining(['Brief received', 'Quote v1 sent', 'Changes requested', 'Quote v2 sent', 'Quote accepted']));

    const stored = await prisma.quote.findUniqueOrThrow({ where: { id: v2.id } });
    expect(stored).toMatchObject({ status: 'ACCEPTED', acceptedIp: '10.9.8.7' });
    expect(stored.acceptedByUserId).toEqual(expect.any(String));
    const bk = await prisma.booking.findUniqueOrThrow({ where: { id: b.bookingId }, include: { milestones: true } });
    expect(bk).toMatchObject({ sellingTotalPaise: 59_000_000n, payoutTotalPaise: 38_000_000n, marginPaise: 8_000_000n });
    expect(bk.milestones.filter((m) => m.isAdvance)).toHaveLength(1);

    await http().post(`/v1/me/bookings/${b.ref}/quotes/${v2.id}/decision`).set(auth(b.customer)).send({ action: 'accept' }).expect(409);
    expect((await http().post(`/v1/admin/bookings/${b.bookingId}/quotes`).set(auth(sales)).send(quote()).expect(409)).body.error.code).toBe('PRICE_LOCKED');
  });

  it('expired quotes can’t be accepted', async () => {
    const c = await bookingReady(aanya.slug);
    const q = (await http().post(`/v1/admin/bookings/${c.bookingId}/quotes`).set(auth(manager)).send(quote({ fee: 500_000, payout: 380_000 })).expect(201)).body.data;
    await http().post(`/v1/admin/quotes/${q.id}/send`).set(auth(sales)).expect(200);
    await prisma.quote.update({ where: { id: q.id }, data: { validUntil: new Date(Date.now() - 60_000) } });
    expect(CustomerBookingSchema.parse((await http().get(`/v1/me/bookings/${c.ref}`).set(auth(c.customer)).expect(200)).body.data).quotes[0]!.status).toBe('EXPIRED');
    expect((await http().post(`/v1/me/bookings/${c.ref}/quotes/${q.id}/decision`).set(auth(c.customer)).send({ action: 'accept' }).expect(409)).body.error.code).toBe('QUOTE_EXPIRED');
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: q.id } })).status).toBe('EXPIRED');
  });

  it('a fee under the talent’s minimum rate needs approval', async () => {
    const c = await bookingReady(aanya.slug);
    const q = (await http().post(`/v1/admin/bookings/${c.bookingId}/quotes`).set(auth(manager)).send(quote({ fee: 250_000, payout: 150_000 })).expect(201)).body.data;
    expect(q.approval.reasons).toEqual(['BELOW_MINIMUM_RATE']);
    expect((await http().post(`/v1/admin/quotes/${q.id}/send`).set(auth(sales)).expect(200)).body.data.status).toBe('PENDING_APPROVAL');
    expect((await http().post(`/v1/admin/quotes/${q.id}/return`).set(auth(admin)).send({ note: 'Too low, try 3L' }).expect(200)).body.data.status).toBe('DRAFT');
  });
});
