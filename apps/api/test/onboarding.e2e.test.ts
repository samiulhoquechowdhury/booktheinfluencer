import { randomInt } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SMS_SENDER, type ConsoleSmsSender } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { ensureCategory } from './support/fixtures';
import { retireStaff, staffSession } from './support/staff';

let app: NestExpressApplication;
let prisma: PrismaService;
let sms: ConsoleSmsSender;
let manager: { token: string };
const emails: string[] = [];
const phone = `98${String(randomInt(0, 100_000_000)).padStart(8, '0')}`;
let token: string;
const http = () => request(app.getHttpServer());
const as = (t: string) => ({ Authorization: `Bearer ${t}` });
// Smallest JPEG header the storage accepts (FF D8 FF …); dimensions are declared by the browser.
const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64')}`;
const photo = { dataUrl: JPEG, width: 1200, height: 1500 };

const profile = {
  stageName: 'Onboard Test Singer',
  categories: ['singers'],
  tagline: 'Assamese folk and Bollywood live',
  bio: 'A live singer from Guwahati performing Bihu, Assamese modern songs and Bollywood sets for weddings and college fests.',
  baseCity: 'guwahati',
  travelsPanIndia: true,
  languages: ['Assamese', 'Hindi'],
  eventTypes: ['WEDDING', 'COLLEGE_FEST'],
  feeBand: { minRupees: 50_000, maxRupees: 150_000 },
};

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  sms = app.get(SMS_SENDER);
  await ensureCategory(prisma, 'singers');
  manager = await staffSession(app, ['TALENT_MANAGER'], emails);
  await http().post('/v1/auth/otp/send').send({ phone }).expect(202);
  token = (await http().post('/v1/auth/otp/verify').send({ phone, code: sms.lastCode(`+91${phone}`), as: 'talent' }).expect(200)).body.data.accessToken;
});

afterAll(async () => {
  await retireStaff(prisma, emails);
  await prisma.talent.deleteMany({ where: { user: { phone: `+91${phone}` } } });
  await prisma.refreshToken.deleteMany({ where: { user: { OR: [{ phone: `+91${phone}` }, { email: { in: emails } }] } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: `+91${phone}` } });
  await prisma.user.deleteMany({ where: { OR: [{ phone: `+91${phone}` }, { email: { in: emails } }] } });
  await app.close();
});

describe('talent self-onboarding', () => {
  let talentId: string;
  let slug: string;

  it('saves a draft and lists what is missing', async () => {
    const d = (await http().put('/v1/portal/onboarding').set(as(token)).send(profile).expect(200)).body.data;
    expect(d).toMatchObject({ status: 'DRAFT', profile: { stageName: 'Onboard Test Singer', categories: ['singers'] }, gaps: ['4 more photos'] });
    slug = d.slug;
    talentId = (await prisma.talent.findUniqueOrThrow({ where: { slug } })).id;
    expect((await http().post('/v1/portal/onboarding/submit').set(as(token)).expect(409)).body.error.code).toBe('PROFILE_INCOMPLETE');
  });

  it('takes JPEG photos only, up to six; the first is the cover', async () => {
    await http().post('/v1/portal/onboarding/photos').set(as(token)).send({ ...photo, dataUrl: `data:image/jpeg;base64,${Buffer.from('not an image').toString('base64')}` }).expect(400);
    let d;
    for (let i = 0; i < 4; i++) d = (await http().post('/v1/portal/onboarding/photos').set(as(token)).send(photo).expect(201)).body.data;
    expect(d.photos).toHaveLength(4);
    expect(d.gaps).toEqual([]);
    const file = d.photos[0].src as string;
    expect(file).toMatch(/^\/media\/[0-9a-f-]{36}\.jpg$/);
    await http().get(`/v1${file}`).expect(200).expect('content-type', /image\/jpeg/);
    await http().get('/v1/media/..%2F..%2Fpackage.json').expect(404);
  });

  it('submits for review; staff send it back with a note; the talent resubmits', async () => {
    expect((await http().post('/v1/portal/onboarding/submit').set(as(token)).expect(200)).body.data.status).toBe('IN_REVIEW');
    const pending = (await http().get('/v1/admin/talents?review=pending').set(as(manager.token)).expect(200)).body.data;
    expect(pending.map((t: { id: string }) => t.id)).toContain(talentId);

    await http().post(`/v1/admin/talents/${talentId}/review`).set(as(manager.token)).send({ decision: 'changes', note: 'short' }).expect(400);
    await http().post(`/v1/admin/talents/${talentId}/review`).set(as(manager.token)).send({ decision: 'changes', note: 'Please add a brighter stage photo as the cover.' }).expect(200);
    const back = (await http().get('/v1/portal/onboarding').set(as(token)).expect(200)).body.data;
    expect(back).toMatchObject({ status: 'CHANGES_REQUESTED', reviewNote: 'Please add a brighter stage photo as the cover.' });

    await http().put(`/v1/portal/onboarding/photos/${back.photos[2].id}/cover`).set(as(token)).expect(200);
    expect((await http().post('/v1/portal/onboarding/submit').set(as(token)).expect(200)).body.data).toMatchObject({ status: 'IN_REVIEW', reviewNote: null });
  });

  it('approval publishes the profile; after that the talent can no longer edit it themselves', async () => {
    await http().get(`/v1/talents/${slug}`).expect(404);
    expect((await http().post(`/v1/admin/talents/${talentId}/review`).set(as(manager.token)).send({ decision: 'approve' }).expect(200)).body.data.status).toBe('PUBLISHED');
    expect((await http().get(`/v1/talents/${slug}`).expect(200)).body.data).toMatchObject({ name: 'Onboard Test Singer', images: expect.any(Array) });
    expect((await http().get('/v1/portal/onboarding').set(as(token)).expect(200)).body.data.status).toBe('LIVE');
    expect((await http().put('/v1/portal/onboarding').set(as(token)).send(profile).expect(409)).body.error.code).toBe('PROFILE_LIVE');
    expect((await http().get('/v1/portal').set(as(token)).expect(200)).body.data.talentSlug).toBe(slug);
  });
});
