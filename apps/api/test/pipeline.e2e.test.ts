import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TERMINAL_STAGES } from '@repo/utils';
import { ConsoleSmsSender, SMS_SENDER } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { ensureCategory } from './support/fixtures';
import { staffSession } from './support/staff';

let app: NestExpressApplication;
let prisma: PrismaService;
let sms: ConsoleSmsSender;
let sales: { userId: string; token: string };
let manager: { userId: string; token: string };
let accounts: { userId: string; token: string };
const run = randomUUID().slice(0, 8);
const emails: string[] = [];
const phones: string[] = [];
const talentIds: string[] = [];
const repIds: string[] = [];
const http = () => request(app.getHttpServer());
const ip = () => `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
const newPhone = () => {
  const p = `9${randomInt(100_000_000, 999_999_999)}`;
  phones.push(`+91${p}`);
  return p;
};
const auth = (s: { token: string }) => ({ Authorization: `Bearer ${s.token}` });
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function talent(key: string, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') {
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
      status,
      representationType: 'PLATFORM_COORDINATED',
      categories: { create: { categoryId: cat.id, isPrimary: true } },
      media: { create: [0, 1, 2, 3].map((i) => ({ key: `/talent/${key}-${i}.jpg`, alt: `${key} photo ${i}`, width: 1200, height: 1500, sortOrder: i, isCover: i === 0 })) },
      reps: { create: { repId: rep.id } },
    },
  });
  talentIds.push(t.id);
  return t;
}

function brief(phone: string, otp: string, talentSlugs: string[]) {
  return {
    event: { eventType: 'WEDDING', date: future(60), city: 'guwahati', venue: 'Radisson Blu', audienceSize: 300, durationMins: 90 },
    talent: { talentSlugs, budgetMinRupees: 200_000, budgetMaxRupees: 400_000, language: 'Assamese', notes: 'Bihu set please' },
    contact: { name: 'Riya Sharma', phone, email: `riya-${run}-${phone}@test.local`, otp, consent: true },
  };
}

async function submit(talentSlugs: string[], status = 201, from = ip()) {
  const phone = newPhone();
  await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
  return http().post('/v1/enquiries').set('X-Forwarded-For', from).send(brief(phone, sms.lastCode(`+91${phone}`)!, talentSlugs)).expect(status);
}

const leadId = async (ref: string) => (await prisma.lead.findUniqueOrThrow({ where: { ref } })).id;
const move = (id: string, body: object, who = sales) => http().post(`/v1/admin/leads/${id}/transition`).set(auth(who)).send(body);

let aanya: { id: string; slug: string };
let bhupen: { id: string; slug: string };
let draft: { id: string; slug: string };

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  sms = app.get(SMS_SENDER);
  sales = await staffSession(app, ['SALES'], emails);
  manager = await staffSession(app, ['TALENT_MANAGER'], emails);
  accounts = await staffSession(app, ['ACCOUNTS'], emails);
  aanya = await talent('aanya');
  bhupen = await talent('bhupen');
  draft = await talent('draft', 'DRAFT');
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { OR: [{ email: { in: emails } }, { phone: { in: phones } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.lead.deleteMany({ where: { OR: [{ customerId: { in: ids } }, { bookings: { some: { talentId: { in: talentIds } } } }] } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.talent.deleteMany({ where: { id: { in: talentIds } } });
  await prisma.representative.deleteMany({ where: { id: { in: repIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: phones } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await app.close();
});

describe('enquiries (T-160, T-167)', () => {
  it('creates a NEW lead with one booking per published talent, signs the customer in, and assigns the least-busy sales owner', async () => {
    const open = await prisma.user.findMany({
      where: { roles: { has: 'SALES' }, deletedAt: null },
      select: { id: true, _count: { select: { ownedLeads: { where: { stage: { notIn: [...TERMINAL_STAGES] } } } } } },
    });
    const fewest = Math.min(...open.map((u) => u._count.ownedLeads));

    const r = await submit([bhupen.slug, draft.slug, aanya.slug]);
    expect(r.body.data).toMatchObject({ ref: expect.stringMatching(/^TB-\d{4}-\d{6}$/), expectedResponseHours: 24 });
    expect(r.body.data.bookingRefs).toHaveLength(2); // the draft talent is ignored
    expect(r.body.data.session.accessToken).toEqual(expect.any(String));
    expect(r.body.data.session.user.roles).toEqual(['CUSTOMER']);
    expect(([] as string[]).concat(r.headers['set-cookie'] ?? []).some((c) => c.startsWith('tp_refresh='))).toBe(true);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { ref: r.body.data.ref }, include: { bookings: { orderBy: { createdAt: 'asc' } }, activities: true } });
    expect(lead.stage).toBe('NEW');
    expect(lead.budgetMinPaise).toBe(200_000n * 100n);
    expect(lead.bookings.map((b) => b.talentId)).toEqual([bhupen.id, aanya.id]); // customer's order
    expect(lead.bookings.map((b) => b.ref)).toEqual(r.body.data.bookingRefs);
    expect(lead.activities.map((a) => a.type).sort()).toEqual(['assigned', 'brief_received']);
    const owner = open.find((u) => u.id === lead.ownerId);
    expect(owner?._count.ownedLeads).toBe(fewest);
  });

  it('rejects a wrong OTP and creates nothing', async () => {
    const phone = newPhone();
    const from = ip();
    await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
    const wrong = sms.lastCode(`+91${phone}`) === '000000' ? '111111' : '000000';
    await http().post('/v1/enquiries').set('X-Forwarded-For', from).send(brief(phone, wrong, [aanya.slug])).expect(400);
    expect(await prisma.user.findUnique({ where: { phone: `+91${phone}` } })).toBeNull();
  });

  it('validates the brief', async () => {
    const r = await http().post('/v1/enquiries').send({ ...brief(newPhone(), '123456', []), event: { eventType: 'WEDDING', date: '2001-01-01' } }).expect(400);
    expect(r.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('limits briefs to 5 per hour per IP', async () => {
    const from = ip();
    const customer = await prisma.user.create({ data: { phone: `+91${newPhone()}`, roles: ['CUSTOMER'] } });
    for (let i = 0; i < 5; i++)
      await prisma.lead.create({ data: { ref: `RL-${run}-${i}`, customerId: customer.id, eventType: 'WEDDING', eventDate: new Date(), city: 'guwahati', createdIp: from } });
    const r = await http().post('/v1/enquiries').set('X-Forwarded-For', from).send(brief(newPhone(), '123456', [aanya.slug])).expect(429);
    expect(r.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('pipeline (T-163..T-166)', () => {
  let id: string;
  let ref: string;

  beforeAll(async () => {
    const r = await submit([aanya.slug]);
    ref = r.body.data.ref;
    id = await leadId(ref);
    await prisma.lead.update({ where: { id }, data: { ownerId: sales.userId } });
  });

  it('lists, filters and groups leads; accounts may read but not change', async () => {
    const list = await http().get(`/v1/admin/leads?q=${ref}`).set(auth(accounts)).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ ref, stage: 'NEW', city: 'guwahati', owner: { id: sales.userId }, talents: [{ availability: 'NOT_CHECKED' }] });
    expect(list.body.meta).toMatchObject({ page: 1, total: 1 });

    const mine = await http().get(`/v1/admin/leads?ownerId=${sales.userId}&stage=NEW&category=singers`).set(auth(sales)).expect(200);
    expect(mine.body.data.map((l: { ref: string }) => l.ref)).toContain(ref);
    await http().get('/v1/admin/leads?stage=WHATEVER').set(auth(sales)).expect(400);

    const board = await http().get(`/v1/admin/pipeline/board?q=${ref}`).set(auth(sales)).expect(200);
    expect(board.body.data).toHaveLength(14);
    expect(board.body.data.find((c: { stage: string }) => c.stage === 'NEW')).toMatchObject({ count: 1, cards: [{ ref }] });

    await move(id, { to: 'CONTACTED' }, accounts).expect(403);
    await http().get('/v1/admin/leads').expect(401);
  });

  it('shows the workspace with brief, contact, bookings and allowed next stages', async () => {
    const w = (await http().get(`/v1/admin/leads/${id}`).set(auth(sales)).expect(200)).body.data;
    expect(w).toMatchObject({ ref, stage: 'NEW', nextStages: ['CONTACTED', 'LOST'], brief: { eventType: 'WEDDING', venue: 'Radisson Blu', budget: { minRupees: 200_000, maxRupees: 400_000 } }, customer: { name: 'Riya Sharma' } });
    expect(w.bookings[0]).toMatchObject({ talent: { slug: aanya.slug }, availability: 'NOT_CHECKED', confirmable: false });
    await http().get('/v1/admin/leads/nope').set(auth(sales)).expect(404);
  });

  it('moves through the state machine only, logging every change', async () => {
    await move(id, { to: 'QUOTE_SENT' }).expect(409);
    await move(id, { to: 'CONFIRMED' }).expect(409);
    await move(id, { to: 'CONTACTED', note: 'Called the customer' }).expect(200);
    await move(id, { to: 'REQUIREMENT_RECEIVED' }).expect(200);
    await move(id, { to: 'SHORTLISTED' }).expect(200);
    const w = (await move(id, { to: 'AVAILABILITY_CHECK' }).expect(200)).body.data;
    expect(w.stage).toBe('AVAILABILITY_CHECK');
    expect(w.nextStages).toEqual(['QUOTE_SENT', 'SHORTLISTED', 'LOST']);
    const changes = w.activity.filter((a: { type: string }) => a.type === 'stage_change');
    expect(changes).toHaveLength(4);
    expect(changes.at(-1)).toMatchObject({ body: 'Called the customer', meta: { from: 'NEW', to: 'CONTACTED' }, actor: 'Test Staff' });
    expect(await prisma.auditLog.count({ where: { action: 'lead.transition', entityId: id } })).toBe(4);
  });

  it('needs an owner to contact, and a reason to lose', async () => {
    const other = await leadId((await submit([bhupen.slug])).body.data.ref);
    await prisma.lead.update({ where: { id: other }, data: { ownerId: null } });
    const r = await move(other, { to: 'CONTACTED' }).expect(409);
    expect(r.body.error.code).toBe('OWNER_REQUIRED');

    await http().patch(`/v1/admin/leads/${other}/owner`).set(auth(sales)).send({ ownerId: accounts.userId }).expect(400);
    await http().patch(`/v1/admin/leads/${other}/owner`).set(auth(sales)).send({ ownerId: sales.userId }).expect(200);
    await move(other, { to: 'CONTACTED' }).expect(200);

    expect((await move(other, { to: 'LOST' }).expect(409)).body.error.code).toBe('REASON_REQUIRED');
    const lost = (await move(other, { to: 'LOST', reason: 'Budget too low' }).expect(200)).body.data;
    expect(lost).toMatchObject({ stage: 'LOST', lostReason: 'Budget too low', nextStages: [] });
    await move(other, { to: 'CONTACTED' }).expect(409);
  });

  it('adds and removes talent on the shortlist', async () => {
    let w = (await http().post(`/v1/admin/leads/${id}/bookings`).set(auth(sales)).send({ talentSlug: bhupen.slug }).expect(201)).body.data;
    expect(w.bookings).toHaveLength(2);
    await http().post(`/v1/admin/leads/${id}/bookings`).set(auth(sales)).send({ talentSlug: bhupen.slug }).expect(409);
    await http().post(`/v1/admin/leads/${id}/bookings`).set(auth(sales)).send({ talentSlug: draft.slug }).expect(404);
    const added = w.bookings.find((b: { talent: { slug: string } }) => b.talent.slug === bhupen.slug);
    w = (await http().delete(`/v1/admin/leads/${id}/bookings/${added.id}`).set(auth(sales)).expect(200)).body.data;
    expect(w.bookings).toHaveLength(1);
  });

  it('notes go on the timeline', async () => {
    const n = await http().post(`/v1/admin/leads/${id}/notes`).set(auth(sales)).send({ text: 'Prefers an evening slot' }).expect(201);
    expect(n.body.data).toMatchObject({ type: 'note', body: 'Prefers an evening slot' });
  });

  it('availability: staff set working statuses, never CONFIRMED; rep acceptance needs availability; the system confirms when every condition holds', async () => {
    const bookingId = (await prisma.booking.findFirstOrThrow({ where: { leadId: id } })).id;
    const avail = (status: string, who = manager) => http().put(`/v1/admin/bookings/${bookingId}/availability`).set(auth(who)).send({ status, note: 'Spoke to the manager' });

    await avail('AVAILABLE', accounts).expect(403);
    expect((await avail('CONFIRMED').expect(409)).body.error.code).toBe('SYSTEM_ONLY');
    await http().post(`/v1/admin/bookings/${bookingId}/rep-acceptance`).set(auth(manager)).send({}).expect(409);
    await avail('AWAITING_MANAGER').expect(200);
    const w = (await avail('AVAILABLE').expect(200)).body.data;
    expect(w.bookings[0].availability).toBe('AVAILABLE');
    expect(w.activity.find((a: { type: string }) => a.type === 'availability')).toMatchObject({ meta: { from: 'AWAITING_MANAGER', to: 'AVAILABLE' } });

    // Quotes, contracts and payments arrive in M1.5/M1.6; stand them in directly.
    const quote = await prisma.quote.create({ data: { bookingId, version: 1, status: 'SENT', validUntil: new Date(Date.now() + 7 * 86_400_000), subtotalPaise: 1n, taxPaise: 0n, totalPaise: 1n, internalCostPaise: 1n, milestonePlan: [] } });
    await move(id, { to: 'QUOTE_SENT' }).expect(200);
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
    await move(id, { to: 'ADVANCE_PENDING' }).expect(200);
    await prisma.contract.create({ data: { bookingId, status: 'SIGNED', signedAt: new Date() } });
    await prisma.paymentMilestone.create({ data: { bookingId, label: 'Advance', amountPaise: 1n, dueDate: new Date(), status: 'PAID', isAdvance: true } });

    // The last missing condition: the representative's acceptance → automatic confirmation.
    const done = (await http().post(`/v1/admin/bookings/${bookingId}/rep-acceptance`).set(auth(manager)).send({ note: 'Agreed on call' }).expect(200)).body.data;
    expect(done.stage).toBe('CONFIRMED');
    expect(done.bookings[0]).toMatchObject({ availability: 'CONFIRMED', confirmedAt: expect.any(String), repAcceptedAt: expect.any(String) });
    expect(done.activity.map((a: { type: string }) => a.type)).toEqual(expect.arrayContaining(['rep_accepted', 'confirmed']));
    expect(done.nextStages).toEqual(['EVENT_COMPLETED', 'CANCELLED']);

    await http().post(`/v1/admin/bookings/${bookingId}/rep-acceptance`).set(auth(manager)).send({}).expect(409);
    expect((await avail('UNAVAILABLE').expect(409)).body.error.code).toBe('SYSTEM_ONLY');
    await http().delete(`/v1/admin/leads/${id}/bookings/${bookingId}`).set(auth(sales)).expect(409);

    // After the event: completion note is required for settlement.
    await move(id, { to: 'EVENT_COMPLETED' }).expect(200);
    expect((await move(id, { to: 'SETTLEMENT' }).expect(409)).body.error.code).toBe('COMPLETION_NOTE_REQUIRED');
    await move(id, { to: 'SETTLEMENT', completionNote: 'Great show, ran 20 min over' }).expect(200);
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).toMatchObject({ completionNote: 'Great show, ran 20 min over', completedAt: expect.any(Date) });
    expect((await move(id, { to: 'CLOSED' }).expect(409)).body.error.code).toBe('SETTLEMENT_INCOMPLETE');
  });
});
