import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PublicTalentSchema } from '@repo/schemas';
import { ConsoleSmsSender, SMS_SENDER } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { publishedTalent, type Track } from './support/fixtures';

let app: NestExpressApplication;
let prisma: PrismaService;
let sms: ConsoleSmsSender;
const run = randomUUID().slice(0, 8);
const track: Track = { talentIds: [], repIds: [], phones: [] };
const http = () => request(app.getHttpServer());
const ip = () => `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
let customer: { token: string };
let slug: string;
let draftSlug: string;

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  sms = app.get(SMS_SENDER);
  slug = (await publishedTalent(prisma, 'fav', run, track)).slug;
  const draft = await publishedTalent(prisma, 'favdraft', run, track);
  await prisma.talent.update({ where: { id: draft.id }, data: { status: 'DRAFT' } });
  draftSlug = draft.slug;
  const phone = `9${randomInt(100_000_000, 999_999_999)}`;
  track.phones.push(`+91${phone}`);
  const from = ip();
  await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
  const r = await http().post('/v1/auth/otp/verify').set('X-Forwarded-For', from).send({ phone, code: sms.lastCode(`+91${phone}`), name: 'Fav Tester' }).expect(200);
  customer = { token: r.body.data.accessToken };
});

afterAll(async () => {
  const ids = (await prisma.user.findMany({ where: { phone: { in: track.phones } }, select: { id: true } })).map((u) => u.id);
  await prisma.contactMessage.deleteMany({ where: { email: { endsWith: `-${run}@test.local` } } });
  await prisma.talent.deleteMany({ where: { id: { in: track.talentIds } } });
  await prisma.representative.deleteMany({ where: { id: { in: track.repIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: track.phones } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await app.close();
});

const auth = () => ({ Authorization: `Bearer ${customer.token}` });

describe('favourites', () => {
  it('adds, lists (public shape) and removes published talent only', async () => {
    expect((await http().put(`/v1/me/favourites/${slug}`).set(auth()).expect(200)).body.data).toEqual({ slug, favourite: true });
    await http().put(`/v1/me/favourites/${slug}`).set(auth()).expect(200); // idempotent
    await http().put(`/v1/me/favourites/${draftSlug}`).set(auth()).expect(404);
    const list = z.array(PublicTalentSchema).parse((await http().get('/v1/me/favourites').set(auth()).expect(200)).body.data);
    expect(list.map((t) => t.slug)).toEqual([slug]);
    expect((await http().delete(`/v1/me/favourites/${slug}`).set(auth()).expect(200)).body.data).toEqual({ slug, favourite: false });
    expect((await http().get('/v1/me/favourites').set(auth()).expect(200)).body.data).toEqual([]);
    await http().get('/v1/me/favourites').expect(401);
  });
});

describe('contact form', () => {
  const msg = (n: number) => ({ name: 'Asha Bora', email: `asha${n}-${run}@test.local`, phone: '', topic: 'corporate', message: 'We need a singer for our annual day in March.' });

  it('stores the message with a reference, validates input and limits 5/hour per IP', async () => {
    const from = ip();
    const r = await http().post('/v1/contact').set('X-Forwarded-For', from).send(msg(0)).expect(201);
    expect(r.body.data.ref).toMatch(/^CT-\d{4}-\d{6}$/);
    expect(await prisma.contactMessage.findUniqueOrThrow({ where: { ref: r.body.data.ref } })).toMatchObject({ topic: 'corporate', phone: null, createdIp: from });
    await http().post('/v1/contact').send({ ...msg(9), message: 'short' }).expect(400);
    for (let i = 1; i < 5; i++) await http().post('/v1/contact').set('X-Forwarded-For', from).send(msg(i)).expect(201);
    expect((await http().post('/v1/contact').set('X-Forwarded-For', from).send(msg(6)).expect(429)).body.error.code).toBe('RATE_LIMITED');
  });
});
