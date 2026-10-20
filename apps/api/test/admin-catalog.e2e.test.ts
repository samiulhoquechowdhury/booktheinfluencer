import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PublicTalentSchema } from '@repo/schemas';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { ensureCategory } from './support/fixtures';
import { retireStaff, staffSession } from './support/staff';

let app: NestExpressApplication;
let prisma: PrismaService;
let manager: { userId: string; token: string };
let sales: { userId: string; token: string };
const emails: string[] = [];
const talentIds: string[] = [];
const repIds: string[] = [];
const run = randomUUID().slice(0, 6);
const http = () => request(app.getHttpServer());
const as = (t: { token: string }) => ({ Authorization: `Bearer ${t.token}` });

const draft = (over: Record<string, unknown> = {}) => ({
  stageName: `Mira Kalita ${run}`,
  tagline: 'Soulful Bihu and folk',
  bio: 'Singer from Jorhat.',
  baseCity: 'guwahati',
  languages: ['Assamese', 'Hindi'],
  eventTypes: ['WEDDING', 'CONCERT'],
  tags: ['bihu'],
  representationType: 'PLATFORM_COORDINATED',
  feeBand: { minRupees: 150000, maxRupees: 300000 },
  categories: ['singers'],
  ...over,
});
const photo = (i: number) => ({ key: `/talent/test-${run}-${i}.jpg`, alt: `Photo ${i}`, width: 1200, height: 1500 });

async function createTalent(over: Record<string, unknown> = {}) {
  const r = await http().post('/v1/admin/talents').set(as(manager)).send(draft(over)).expect(201);
  talentIds.push(r.body.data.id);
  return r.body.data as { id: string; slug: string; status: string };
}
async function addPhotos(id: string, n = 4) {
  for (let i = 0; i < n; i++) await http().post(`/v1/admin/talents/${id}/media`).set(as(manager)).send(photo(i)).expect(201);
}

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  await ensureCategory(prisma, 'singers', 'Singers');
  manager = await staffSession(app, ['TALENT_MANAGER'], emails);
  sales = await staffSession(app, ['SALES'], emails);
});

afterAll(async () => {
  await retireStaff(prisma, emails);
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.talent.deleteMany({ where: { id: { in: talentIds } } });
  await prisma.representative.deleteMany({ where: { id: { in: repIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await app.close();
});

describe('talent lifecycle (T-141, ADM-1/5)', () => {
  it('creates a draft with a generated slug and rupee fee band', async () => {
    const t = await createTalent();
    expect(t.status).toBe('DRAFT');
    expect(t.slug).toBe(`mira-kalita-${run}`.toLowerCase());
    const again = await createTalent();
    expect(again.slug).toBe(`${t.slug}-2`); // unique
    const got = await http().get(`/v1/admin/talents/${t.id}`).set(as(sales)).expect(200);
    expect(got.body.data.feeBand).toEqual({ minRupees: 150000, maxRupees: 300000 });
    const row = await prisma.talent.findUniqueOrThrow({ where: { id: t.id } });
    expect(row.feeBandMinPaise).toBe(15_000_000n);
  });

  it('refuses to publish until the profile is complete, listing every gap', async () => {
    const t = await createTalent({ tagline: '', eventTypes: [] });
    const r = await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'PUBLISHED' }).expect(409);
    expect(r.body.error.code).toBe('NOT_PUBLISHABLE');
    expect(r.body.error.details.gaps).toEqual(expect.arrayContaining(['at least 4 photos (has 0)', 'a tagline', 'at least one event type']));
  });

  it('publishes, appears in the public catalogue, then hides', async () => {
    const t = await createTalent();
    await http().get(`/v1/talents/${t.slug}`).expect(404); // drafts are invisible
    await addPhotos(t.id);
    await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'PUBLISHED' }).expect(200);

    const pub = await http().get(`/v1/talents/${t.slug}`).expect(200);
    expect(PublicTalentSchema.parse(pub.body.data)).toMatchObject({ name: `Mira Kalita ${run}`, images: expect.any(Array) });
    expect(pub.body.data.images[0].src).toBe(`/talent/test-${run}-0.jpg`);

    await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'HIDDEN' }).expect(200);
    await http().get(`/v1/talents/${t.slug}`).expect(404);
  });

  it('keeps a live profile publishable when edited', async () => {
    const t = await createTalent();
    await addPhotos(t.id);
    await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'PUBLISHED' }).expect(200);
    const r = await http().patch(`/v1/admin/talents/${t.id}`).set(as(manager)).send({ bio: '' }).expect(409);
    expect(r.body.error.code).toBe('NOT_PUBLISHABLE');
    const ok = await http().patch(`/v1/admin/talents/${t.id}`).set(as(manager)).send({ tagline: 'New tagline', categories: ['singers'] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.tagline).toBe('New tagline');
  });

  it('validates input: fee band must be a range', async () => {
    const r = await http().post('/v1/admin/talents').set(as(manager)).send(draft({ feeBand: { minRupees: 300000, maxRupees: 300000 } })).expect(400);
    expect(r.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('sales can read but not edit', async () => {
    await http().get('/v1/admin/talents?pageSize=5').set(as(sales)).expect(200);
    await http().post('/v1/admin/talents').set(as(sales)).send(draft()).expect(403);
  });
});

describe('photos (T-142)', () => {
  it('reorders (first = cover), rejects bad orders, and protects live profiles', async () => {
    const t = await createTalent();
    await addPhotos(t.id);
    const before = (await http().get(`/v1/admin/talents/${t.id}`).set(as(manager))).body.data.media as { id: string }[];
    const reversed = before.map((m) => m.id).reverse();
    const r = await http().put(`/v1/admin/talents/${t.id}/media/order`).set(as(manager)).send({ ids: reversed }).expect(200);
    expect(r.body.data[0]).toMatchObject({ id: reversed[0], isCover: true });
    await http().put(`/v1/admin/talents/${t.id}/media/order`).set(as(manager)).send({ ids: reversed.slice(1) }).expect(400);

    await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'PUBLISHED' }).expect(200);
    const del = await http().delete(`/v1/admin/talents/${t.id}/media/${reversed[0]}`).set(as(manager)).expect(409);
    expect(del.body.error.code).toBe('NOT_PUBLISHABLE');
  });
});

describe('rate cards (T-143, INTERNAL)', () => {
  it('managers write, sales read, duplicates refused, and the public never sees them', async () => {
    const t = await createTalent();
    const card = { eventType: 'WEDDING', minimumRupees: 180000, sellingRupees: 250000, commissionBps: 1500, notes: 'Peak season' };
    await http().post(`/v1/admin/talents/${t.id}/rate-cards`).set(as(sales)).send(card).expect(403);
    const created = await http().post(`/v1/admin/talents/${t.id}/rate-cards`).set(as(manager)).send(card).expect(201);
    expect(created.body.data).toMatchObject({ minimumRupees: 180000, commissionBps: 1500 });
    expect((await http().post(`/v1/admin/talents/${t.id}/rate-cards`).set(as(manager)).send(card).expect(409)).body.error.code).toBe('CONFLICT');
    expect((await http().get(`/v1/admin/talents/${t.id}/rate-cards`).set(as(sales)).expect(200)).body.data).toHaveLength(1);
    await http().post(`/v1/admin/talents/${t.id}/rate-cards`).set(as(manager)).send({ ...card, eventType: 'CONCERT', sellingRupees: 100000 }).expect(400); // selling < minimum

    await addPhotos(t.id);
    await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'PUBLISHED' }).expect(200);
    const pub = await http().get(`/v1/talents/${t.slug}`).expect(200);
    expect(pub.text).not.toContain('18000000');
    expect(pub.text).not.toContain('Peak season');
  });
});

describe('representatives (T-144)', () => {
  it('creates, verifies and links a rep — the public profile then shows verified', async () => {
    const t = await createTalent();
    await addPhotos(t.id);
    await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'PUBLISHED' }).expect(200);
    const rep = await http().post('/v1/admin/reps').set(as(manager)).send({ name: `Agency ${run}`, phone: '9864099999', agencyName: 'NE Talent Co' }).expect(201);
    repIds.push(rep.body.data.id);
    expect(rep.body.data.phone).toBe('+919864099999');

    await http().put(`/v1/admin/talents/${t.id}/reps/${rep.body.data.id}`).set(as(manager)).expect(204);
    expect((await http().get(`/v1/talents/${t.slug}`)).body.data.verified).toBe(false);
    await http().put(`/v1/admin/reps/${rep.body.data.id}/verification`).set(as(manager)).send({ status: 'VERIFIED', note: 'KYC checked' }).expect(200);
    expect((await http().get(`/v1/talents/${t.slug}`)).body.data.verified).toBe(true);

    await http().delete(`/v1/admin/talents/${t.id}/reps/${rep.body.data.id}`).set(as(manager)).expect(204);
    expect((await http().get(`/v1/talents/${t.slug}`)).body.data.verified).toBe(false);
  });
});

describe('blackouts (T-145)', () => {
  it('adds, refuses duplicates, hides the talent on that date, and removes', async () => {
    const t = await createTalent();
    await addPhotos(t.id);
    await http().put(`/v1/admin/talents/${t.id}/status`).set(as(manager)).send({ status: 'PUBLISHED' }).expect(200);
    const b = await http().post(`/v1/admin/talents/${t.id}/blackouts`).set(as(manager)).send({ date: '2027-03-15', note: 'Studio' }).expect(201);
    expect((await http().post(`/v1/admin/talents/${t.id}/blackouts`).set(as(manager)).send({ date: '2027-03-15' }).expect(409)).body.error.code).toBe('CONFLICT');

    const onDate = await http().get(`/v1/talents?date=2027-03-15&q=${run}&pageSize=48`).expect(200);
    expect(onDate.body.data.map((x: { slug: string }) => x.slug)).not.toContain(t.slug);

    await http().delete(`/v1/admin/talents/${t.id}/blackouts/${b.body.data.id}`).set(as(manager)).expect(204);
    const after = await http().get(`/v1/talents?date=2027-03-15&q=${run}&pageSize=48`).expect(200);
    expect(after.body.data.map((x: { slug: string }) => x.slug)).toContain(t.slug);
  });
});

describe('categories (T-140) and audit', () => {
  it('refuses duplicate slugs and deleting a category in use', async () => {
    expect((await http().post('/v1/admin/categories').set(as(manager)).send({ slug: 'singers', name: 'Dup' }).expect(409)).body.error.code).toBe('CONFLICT');
    const singers = (await http().get('/v1/admin/categories').set(as(sales)).expect(200)).body.data.find((c: { slug: string }) => c.slug === 'singers');
    expect((await http().delete(`/v1/admin/categories/${singers.id}`).set(as(manager)).expect(409)).body.error.code).toBe('IN_USE');
  });

  it('audits every change with before/after', async () => {
    const actions = (await prisma.auditLog.findMany({ where: { actorId: manager.userId }, select: { action: true } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['talent.create', 'talent.update', 'talent.status', 'talent.media.add', 'talent.media.order', 'ratecard.create', 'rep.create', 'rep.verification', 'talent.rep.link', 'blackout.add', 'blackout.remove']));
  });
});
