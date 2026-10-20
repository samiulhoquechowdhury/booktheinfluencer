import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CustomerBookingSchema, PayIntentSchema } from '@repo/schemas';
import { ConsoleSmsSender, SMS_SENDER } from '../src/auth/sms';
import { hmacHex } from '../src/common/hmac';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp, testEnv } from './support/app';
import { publishedTalent, type Track } from './support/fixtures';
import { staffSession } from './support/staff';

type Session = { userId: string; token: string };
let app: NestExpressApplication;
let prisma: PrismaService;
let sms: ConsoleSmsSender;
let sales: Session, manager: Session, accounts: Session;
const run = randomUUID().slice(0, 8);
const emails: string[] = [];
const track: Track = { talentIds: [], repIds: [], phones: [] };
const http = () => request(app.getHttpServer());
const auth = (s: { token: string }) => ({ Authorization: `Bearer ${s.token}` });
const ip = () => `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const evt = () => `evt_${randomUUID()}`;

/** A signed delivery exactly as the fake gateway / e-sign provider would send it. */
function signed(path: 'payments' | 'esign', body: object, eventId = evt(), secret?: string) {
  const raw = JSON.stringify(body);
  const key = secret ?? (path === 'payments' ? testEnv.PAYMENT_WEBHOOK_SECRET : testEnv.ESIGN_WEBHOOK_SECRET);
  const [sig, id] = path === 'payments' ? ['x-gateway-signature', 'x-gateway-event-id'] : ['x-esign-signature', 'x-esign-event-id'];
  return http().post(`/v1/webhooks/${path}`).set('Content-Type', 'application/json').set(sig, hmacHex(key, raw)).set(id, eventId).send(raw);
}
const paid = (linkId: string, paymentId: string, amountPaise: bigint | string) => ({
  event: 'payment_link.paid',
  payload: { payment_link: { entity: { id: linkId } }, payment: { entity: { id: paymentId, amount: String(amountPaise), method: 'upi' } } },
});

/** Customer brief → available talent → accepted quote (₹5L fee + ₹50k travel, 30/70 plan). */
async function acceptedBooking(slug: string) {
  const phone = `9${randomInt(100_000_000, 999_999_999)}`;
  track.phones.push(`+91${phone}`);
  const from = ip();
  await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
  const r = await http()
    .post('/v1/enquiries')
    .set('X-Forwarded-For', from)
    .send({
      event: { eventType: 'WEDDING', date: future(90), city: 'guwahati', venue: 'Vivanta', audienceSize: 400, durationMins: 90 },
      talent: { talentSlugs: [slug], budgetMinRupees: 300_000, budgetMaxRupees: 700_000 },
      contact: { name: 'Riya Sharma', phone, email: `riya-${run}-${phone}@test.local`, otp: sms.lastCode(`+91${phone}`)!, consent: true },
    })
    .expect(201);
  const customer = { token: r.body.data.session.accessToken as string };
  const lead = await prisma.lead.findUniqueOrThrow({ where: { ref: r.body.data.ref }, include: { bookings: true } });
  const booking = lead.bookings[0]!;
  await prisma.lead.update({ where: { id: lead.id }, data: { stage: 'AVAILABILITY_CHECK', ownerId: sales.userId } });
  await prisma.booking.update({ where: { id: booking.id }, data: { availability: 'AVAILABLE' } });
  const q = (
    await http()
      .post(`/v1/admin/bookings/${booking.id}/quotes`)
      .set(auth(manager))
      .send({
        validUntil: future(14),
        lines: [
          { type: 'TALENT_FEE', description: 'Performance', amountRupees: 500_000, payoutRupees: 380_000 },
          { type: 'TRAVEL', description: 'Flights', amountRupees: 50_000 },
        ],
        milestones: [
          { label: 'Advance', percentBps: 3000, dueDate: future(3) },
          { label: 'Balance', percentBps: 7000, dueDate: future(80) },
        ],
      })
      .expect(201)
  ).body.data;
  await http().post(`/v1/admin/quotes/${q.id}/send`).set(auth(sales)).expect(200);
  await http().post(`/v1/me/bookings/${booking.ref}/quotes/${q.id}/decision`).set(auth(customer)).send({ action: 'accept' }).expect(200);
  const milestones = await prisma.paymentMilestone.findMany({ where: { bookingId: booking.id }, orderBy: { dueDate: 'asc' } });
  return { leadId: lead.id, bookingId: booking.id, ref: booking.ref, customer, advance: milestones[0]!, balance: milestones[1]! };
}

let slug: string;

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  sms = app.get(SMS_SENDER);
  [sales, manager, accounts] = await Promise.all([staffSession(app, ['SALES'], emails), staffSession(app, ['TALENT_MANAGER'], emails), staffSession(app, ['ACCOUNTS'], emails)]);
  slug = (await publishedTalent(prisma, 'zubeen', run, track)).slug;
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { OR: [{ email: { in: emails } }, { phone: { in: track.phones } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  const leads = await prisma.lead.findMany({ where: { customerId: { in: ids } }, select: { id: true, bookings: { select: { id: true, contracts: { select: { id: true } }, milestones: { select: { id: true } } } } } });
  const bookingIds = leads.flatMap((l) => l.bookings.map((b) => b.id));
  const milestoneIds = leads.flatMap((l) => l.bookings.flatMap((b) => b.milestones.map((m) => m.id)));
  const contractIds = leads.flatMap((l) => l.bookings.flatMap((b) => b.contracts.map((c) => c.id)));
  await prisma.payment.deleteMany({ where: { milestoneId: { in: milestoneIds } } }); // Payment → milestone is Restrict
  await prisma.lead.deleteMany({ where: { id: { in: leads.map((l) => l.id) } } });
  await prisma.webhookEvent.deleteMany({ where: { payload: { path: ['testRun'], equals: run } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: [...bookingIds, ...milestoneIds, ...contractIds] } }] } });
  await prisma.talent.deleteMany({ where: { id: { in: track.talentIds } } });
  await prisma.representative.deleteMany({ where: { id: { in: track.repIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: track.phones } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await app.close();
});

describe('contracts, payments and confirmation (T-201..T-209)', () => {
  let b: Awaited<ReturnType<typeof acceptedBooking>>;
  let envelope: string;
  let linkId: string;

  beforeAll(async () => {
    b = await acceptedBooking(slug);
  });

  it('contracts go out only after a quote is accepted, one at a time', async () => {
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: b.leadId } });
    expect(lead.stage).toBe('ADVANCE_PENDING');
    const sent = (await http().post(`/v1/admin/bookings/${b.bookingId}/contract`).set(auth(sales)).send({ includeRep: true }).expect(201)).body.data;
    expect(sent[0]).toMatchObject({ status: 'SENT', sentAt: expect.any(String) });
    envelope = sent[0].providerRef;
    expect((await http().post(`/v1/admin/bookings/${b.bookingId}/contract`).set(auth(sales)).send({}).expect(409)).body.error.code).toBe('CONTRACT_EXISTS');
    await http().post(`/v1/admin/bookings/${b.bookingId}/contract`).set(auth(accounts)).send({}).expect(403);
  });

  it('e-sign webhooks: bad signatures rejected, replays ignored, signing tracked', async () => {
    await signed('esign', { envelopeId: envelope, status: 'completed', testRun: run }, evt(), 'x'.repeat(40)).expect(401);
    await http().post('/v1/webhooks/esign').set('x-esign-event-id', evt()).send({ envelopeId: envelope, status: 'completed' }).expect(401);
    expect((await prisma.contract.findFirstOrThrow({ where: { providerRef: envelope } })).status).toBe('SENT');

    const partial = evt();
    expect((await signed('esign', { envelopeId: envelope, status: 'partially_signed', testRun: run }, partial).expect(200)).body.data).toEqual({ processed: true });
    expect((await signed('esign', { envelopeId: envelope, status: 'partially_signed', testRun: run }, partial).expect(200)).body.data).toEqual({ duplicate: true });
    expect((await prisma.contract.findFirstOrThrow({ where: { providerRef: envelope } })).status).toBe('PARTIALLY_SIGNED');

    await signed('esign', { envelopeId: envelope, status: 'completed', testRun: run }).expect(200);
    // A late, out-of-order event can't move a signed contract backwards.
    await signed('esign', { envelopeId: envelope, status: 'partially_signed', testRun: run }).expect(200);
    const c = await prisma.contract.findFirstOrThrow({ where: { providerRef: envelope } });
    expect(c).toMatchObject({ status: 'SIGNED', signedAt: expect.any(Date) });
    await http().post(`/v1/admin/contracts/${c.id}/void`).set(auth(sales)).send({ reason: 'Wrong venue' }).expect(409);
  });

  it('the customer gets one reusable payment link per milestone, advance first', async () => {
    expect((await http().post(`/v1/me/bookings/${b.ref}/milestones/${b.balance.id}/pay`).set(auth(b.customer)).expect(409)).body.error.code).toBe('ADVANCE_FIRST');
    const first = PayIntentSchema.parse((await http().post(`/v1/me/bookings/${b.ref}/milestones/${b.advance.id}/pay`).set(auth(b.customer)).expect(200)).body.data);
    expect(first.amountPaise).toBe(b.advance.amountPaise);
    expect(first.checkoutUrl).toContain('/dev/checkout/plink_fake_');
    const again = PayIntentSchema.parse((await http().post(`/v1/me/bookings/${b.ref}/milestones/${b.advance.id}/pay`).set(auth(b.customer)).expect(200)).body.data);
    expect(again.checkoutUrl).toBe(first.checkoutUrl);
    const m = await prisma.paymentMilestone.findUniqueOrThrow({ where: { id: b.advance.id } });
    expect(m.status).toBe('LINK_SENT');
    linkId = m.gatewayLinkId!;
    await http().post(`/v1/me/bookings/${b.ref}/milestones/${b.advance.id}/pay`).set(auth(sales)).expect(403);
  });

  it('payment webhooks: verified, idempotent, partial payments add up, then the milestone is PAID with a receipt', async () => {
    const half = b.advance.amountPaise / 2n;
    await signed('payments', { ...paid(linkId, `pay_${run}_x`, b.advance.amountPaise), testRun: run }, evt(), 'y'.repeat(40)).expect(401);
    expect(await prisma.payment.count({ where: { milestoneId: b.advance.id } })).toBe(0);

    const e1 = evt();
    await signed('payments', { ...paid(linkId, `pay_${run}_1`, half), testRun: run }, e1).expect(200);
    expect((await prisma.paymentMilestone.findUniqueOrThrow({ where: { id: b.advance.id } })).status).toBe('LINK_SENT');
    // Same delivery twice, and the same payment under a new event id: still one payment.
    expect((await signed('payments', { ...paid(linkId, `pay_${run}_1`, half), testRun: run }, e1).expect(200)).body.data).toEqual({ duplicate: true });
    await signed('payments', { ...paid(linkId, `pay_${run}_1`, half), testRun: run }).expect(200);
    expect(await prisma.payment.count({ where: { milestoneId: b.advance.id } })).toBe(1);

    await signed('payments', { ...paid(linkId, `pay_${run}_2`, b.advance.amountPaise - half), testRun: run }).expect(200);
    const m = await prisma.paymentMilestone.findUniqueOrThrow({ where: { id: b.advance.id } });
    expect(m).toMatchObject({ status: 'PAID', paidAt: expect.any(Date), receiptNo: expect.stringMatching(/^RC-\d{4}-\d{6}$/) });

    // Unknown links and event types we don't act on are acknowledged, not errors.
    await signed('payments', { ...paid('plink_nope', `pay_${run}_3`, 100n), testRun: run }).expect(200);
    expect((await signed('payments', { event: 'order.created', testRun: run }).expect(200)).body.data).toEqual({ ignored: true });
  });

  it('the customer sees the receipt; the booking waits for the rep before confirming', async () => {
    const bk = CustomerBookingSchema.parse((await http().get(`/v1/me/bookings/${b.ref}`).set(auth(b.customer)).expect(200)).body.data);
    expect(bk).toMatchObject({ stage: 'ADVANCE_PENDING', availability: 'AVAILABLE', advancePaid: true, contract: { status: 'SIGNED' } });
    expect(bk.milestones[0]).toMatchObject({ status: 'PAID', receiptNo: expect.stringMatching(/^RC-/), paidAt: expect.any(String) });
    expect(bk.activity.map((a) => a.label)).toEqual(expect.arrayContaining(['Contract sent for signature', 'Contract signed', 'Advance paid']));
  });

  it('rep acceptance completes the four conditions → booking and lead CONFIRMED automatically', async () => {
    const w = (await http().post(`/v1/admin/bookings/${b.bookingId}/rep-acceptance`).set(auth(manager)).send({ note: 'Manager agreed' }).expect(200)).body.data;
    expect(w.stage).toBe('CONFIRMED');
    expect(w.bookings[0]).toMatchObject({ availability: 'CONFIRMED', confirmedAt: expect.any(String) });
    const bk = CustomerBookingSchema.parse((await http().get(`/v1/me/bookings/${b.ref}`).set(auth(b.customer)).expect(200)).body.data);
    expect(bk).toMatchObject({ stage: 'CONFIRMED', availability: 'CONFIRMED' });
    expect(bk.activity.at(-1)?.label).toBe('Booking confirmed');
  });

  it('accounts records the balance by bank transfer; nobody else can', async () => {
    const body = { amountPaise: b.balance.amountPaise.toString(), method: 'bank_transfer', reference: 'UTR12345678', receivedOn: future(0) };
    await http().post(`/v1/admin/milestones/${b.balance.id}/payments`).set(auth(sales)).send(body).expect(403);
    await http().post(`/v1/admin/milestones/${b.balance.id}/payments`).set(auth(accounts)).send({ ...body, receivedOn: future(5) }).expect(400);
    await http().post(`/v1/admin/milestones/${b.balance.id}/payments`).set(auth(accounts)).send({ ...body, reference: 'x' }).expect(400);
    const r = (await http().post(`/v1/admin/milestones/${b.balance.id}/payments`).set(auth(accounts)).send(body).expect(201)).body.data;
    const bal = r.milestones.find((m: { id: string }) => m.id === b.balance.id);
    expect(bal).toMatchObject({ status: 'PAID', receiptNo: expect.stringMatching(/^RC-/), payments: [{ method: 'bank_transfer', manual: true, reference: 'UTR12345678' }] });
    expect(JSON.stringify(r)).not.toMatch(/payout|margin|internalCost/);
    expect((await http().post(`/v1/me/bookings/${b.ref}/milestones/${b.balance.id}/pay`).set(auth(b.customer)).expect(409)).body.error.code).toBe('ALREADY_PAID');
    expect(await prisma.auditLog.count({ where: { action: 'payment.manual', entityId: b.balance.id } })).toBe(1);
  });

  it('collections list: due, overdue (computed from the due date), paid, by booking and search', async () => {
    const c = await acceptedBooking(slug);
    await prisma.paymentMilestone.update({ where: { id: c.advance.id }, data: { dueDate: new Date('2026-01-01T00:00:00.000Z') } });
    const list = (view: string, extra = '') => http().get(`/v1/admin/milestones?view=${view}&bookingId=${c.bookingId}${extra}`).set(auth(accounts));

    const due = (await list('due').expect(200)).body;
    expect(due.data.map((m: { label: string; overdue: boolean }) => [m.label, m.overdue])).toEqual([['Advance', true], ['Balance', false]]);
    expect(due.data[0]).toMatchObject({ booking: { id: c.bookingId, ref: c.ref }, lead: { customer: 'Riya Sharma' }, amountPaise: c.advance.amountPaise.toString() });
    expect(due.meta.overdue.count).toBeGreaterThanOrEqual(1);
    expect((await list('overdue').expect(200)).body.data.map((m: { label: string }) => m.label)).toEqual(['Advance']);
    expect((await list('paid').expect(200)).body.data).toEqual([]);
    expect((await http().get(`/v1/admin/milestones?view=all&q=${c.ref}`).set(auth(sales)).expect(200)).body.data).toHaveLength(2);

    // The fully paid booking from the earlier tests shows under "paid" with receipts.
    const paid = (await http().get(`/v1/admin/milestones?view=paid&bookingId=${b.bookingId}`).set(auth(accounts)).expect(200)).body.data;
    expect(paid.map((m: { receiptNo: string }) => m.receiptNo)).toEqual([expect.stringMatching(/^RC-/), expect.stringMatching(/^RC-/)]);
    await http().get('/v1/admin/milestones').set(auth(b.customer)).expect(403);
    await http().get('/v1/admin/milestones?view=nope').set(auth(accounts)).expect(400);
  });

  it('a contract can’t be sent before the quote is accepted', async () => {
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: b.leadId } });
    const other = await prisma.booking.create({ data: { ref: `BK-T-${run}`, leadId: lead.id, talentId: (await publishedTalent(prisma, 'second', run, track)).id } });
    expect((await http().post(`/v1/admin/bookings/${other.id}/contract`).set(auth(sales)).send({}).expect(409)).body.error.code).toBe('QUOTE_NOT_ACCEPTED');
  });
});
