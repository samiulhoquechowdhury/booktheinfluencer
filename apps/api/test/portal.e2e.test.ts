import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BlackoutSchema, PortalProfileSchema, TalentBookingSchema, TalentPayoutSchema } from '@repo/schemas';
import type { Role } from '@repo/db';
import { ConsoleSmsSender, SMS_SENDER } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { publishedTalent, type Track } from './support/fixtures';
import { staffSession } from './support/staff';

let app: NestExpressApplication;
let prisma: PrismaService;
let sms: ConsoleSmsSender;
const run = randomUUID().slice(0, 8);
const emails: string[] = [];
const track: Track = { talentIds: [], repIds: [], phones: [] };
const http = () => request(app.getHttpServer());
const auth = (s: { token: string }) => ({ Authorization: `Bearer ${s.token}` });
const ip = () => `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const newPhone = () => {
  const p = `9${randomInt(100_000_000, 999_999_999)}`;
  track.phones.push(`+91${p}`);
  return p;
};

/** A phone login with the given roles, signed in by OTP. */
async function phoneLogin(roles: Role[]) {
  const phone = newPhone();
  const user = await prisma.user.create({ data: { phone: `+91${phone}`, name: `${roles[0]} ${run}`, roles } });
  const from = ip();
  await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
  const r = await http().post('/v1/auth/otp/verify').set('X-Forwarded-For', from).send({ phone, code: sms.lastCode(`+91${phone}`) }).expect(200);
  return { userId: user.id, token: r.body.data.accessToken as string };
}

const CUSTOMER_PHONE = `+9198${randomInt(10_000_000, 99_999_999)}`;
const CUSTOMER_EMAIL = `secret-customer-${run}@test.local`;

async function booking(talentId: string, o: { customerId: string; ownerId: string; date: string; availability: 'AVAILABLE' | 'NOT_CHECKED' | 'CONFIRMED'; stage?: 'QUOTE_SENT' | 'LOST' | 'CONFIRMED'; payout?: bigint }) {
  const lead = await prisma.lead.create({
    data: { ref: `TB-T-${randomUUID().slice(0, 12)}`, stage: o.stage ?? 'QUOTE_SENT', customerId: o.customerId, ownerId: o.ownerId, eventType: 'CORPORATE', companyName: 'Acme Tea', eventDate: new Date(`${o.date}T00:00:00.000Z`), city: 'guwahati', venue: 'Taj Vivanta', audienceSize: 300, durationMins: 60, notes: 'INTERNAL NOTE' },
  });
  return prisma.booking.create({
    data: { ref: `BK-T-${randomUUID().slice(0, 12)}`, leadId: lead.id, talentId, availability: o.availability, sellingTotalPaise: 59_000_000n, marginPaise: 8_000_000n, payoutTotalPaise: o.payout ?? null },
  });
}

let talentUser: { userId: string; token: string };
let repUser: { userId: string; token: string };
let manager: { userId: string; token: string };
let main: { id: string; slug: string };
let confirmedDate: string;

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  sms = app.get(SMS_SENDER);
  const sales = await staffSession(app, ['SALES'], emails);
  manager = await staffSession(app, ['TALENT_MANAGER'], emails);
  main = await publishedTalent(prisma, 'papon', run, track);
  const other = await publishedTalent(prisma, 'other', run, track);
  talentUser = await phoneLogin(['TALENT']);
  repUser = await phoneLogin(['REP']);
  await prisma.talent.update({ where: { id: main.id }, data: { userId: talentUser.userId } });
  const rep = await prisma.talentRep.findFirstOrThrow({ where: { talentId: main.id } });
  await prisma.representative.update({ where: { id: rep.repId }, data: { userId: repUser.userId } });

  const customer = await prisma.user.create({ data: { phone: CUSTOMER_PHONE, email: CUSTOMER_EMAIL, name: 'Secret Customer', roles: ['CUSTOMER'] } });
  track.phones.push(CUSTOMER_PHONE);
  const base = { customerId: customer.id, ownerId: sales.userId };
  await booking(main.id, { ...base, date: future(40), availability: 'AVAILABLE', payout: 38_000_000n });
  confirmedDate = future(50);
  const done = await booking(main.id, { ...base, date: confirmedDate, availability: 'CONFIRMED', stage: 'CONFIRMED', payout: 20_000_000n });
  await prisma.payout.create({ data: { bookingId: done.id, amountPaise: 20_000_000n, status: 'PAID', reference: 'NEFT-REF-1', paidAt: new Date() } });
  await booking(main.id, { ...base, date: future(60), availability: 'NOT_CHECKED' }); // internal shortlist: hidden
  await booking(main.id, { ...base, date: future(70), availability: 'AVAILABLE', stage: 'LOST' }); // lost: hidden
  await booking(other.id, { ...base, date: future(45), availability: 'AVAILABLE' }); // someone else's
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { OR: [{ email: { in: emails } }, { phone: { in: track.phones } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  const bookingIds = (await prisma.booking.findMany({ where: { talentId: { in: track.talentIds } }, select: { id: true } })).map((b) => b.id);
  await prisma.payout.deleteMany({ where: { bookingId: { in: bookingIds } } }); // Payout → booking is Restrict
  await prisma.lead.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: track.talentIds } }] } });
  await prisma.talent.deleteMany({ where: { id: { in: track.talentIds } } });
  await prisma.representative.deleteMany({ where: { id: { in: track.repIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: track.phones } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await app.close();
});

describe('talent portal (T-222, T-223)', () => {
  it('shows the linked profile to the talent and to their representative', async () => {
    for (const who of [talentUser, repUser]) {
      const p = PortalProfileSchema.parse((await http().get('/v1/portal').set(auth(who)).expect(200)).body.data);
      expect(p).toEqual({ talentSlug: main.slug, name: `papon ${run}`, blackoutEditable: false });
    }
  });

  it('lists only this talent’s live bookings, with payout only — no selling price, margin or customer contact', async () => {
    const res = await http().get('/v1/portal/bookings').set(auth(talentUser)).expect(200);
    const rows = z.array(TalentBookingSchema).parse(res.body.data); // strict: extra fields throw
    expect(rows).toHaveLength(2);
    expect(rows.map((b) => b.payoutPaise)).toEqual([38_000_000n, 20_000_000n]);
    expect(rows[0]).toMatchObject({ availability: 'AVAILABLE', contract: 'NOT_SENT', event: { title: 'Corporate event · Acme Tea', venue: 'Taj Vivanta' }, pointOfContact: 'Test Staff' });
    for (const leak of ['59000000', 'selling', 'margin', CUSTOMER_PHONE, CUSTOMER_EMAIL, 'Secret Customer', 'INTERNAL NOTE']) expect(res.text).not.toContain(leak);
  });

  it('lists payouts with their status and reference', async () => {
    const res = await http().get('/v1/portal/payouts').set(auth(repUser)).expect(200);
    const rows = z.array(TalentPayoutSchema).parse(res.body.data);
    expect(rows).toEqual([expect.objectContaining({ amountPaise: 20_000_000n, status: 'PAID', reference: 'NEFT-REF-1', eventDate: confirmedDate })]);
  });

  it('is only for linked talent and reps', async () => {
    await http().get('/v1/portal/bookings').expect(401);
    const customer = await phoneLogin(['CUSTOMER']);
    await http().get('/v1/portal/bookings').set(auth(customer)).expect(403);
    const unlinked = await phoneLogin(['TALENT']);
    await http().get('/v1/portal').set(auth(unlinked)).expect(403);
  });

  it('blackout self-editing needs the admin switch, and respects past dates and confirmed bookings', async () => {
    const d = future(30);
    expect((await http().put(`/v1/portal/blackouts/${d}`).set(auth(talentUser)).send({ reason: 'Family wedding' }).expect(403)).body.error.code).toBe('BLACKOUT_LOCKED');

    await http().patch(`/v1/admin/talents/${main.id}`).set(auth(manager)).send({ blackoutSelfEdit: true }).expect(200);
    expect((await http().get('/v1/portal').set(auth(talentUser)).expect(200)).body.data.blackoutEditable).toBe(true);

    const list = z.array(BlackoutSchema).parse((await http().put(`/v1/portal/blackouts/${d}`).set(auth(talentUser)).send({ reason: 'Family wedding' }).expect(200)).body.data);
    expect(list).toEqual([{ date: d, reason: 'Family wedding' }]);
    await http().put(`/v1/portal/blackouts/${d}`).set(auth(talentUser)).send({ reason: 'Moved' }).expect(200); // idempotent update
    expect((await http().get('/v1/portal/blackouts').set(auth(repUser)).expect(200)).body.data).toEqual([{ date: d, reason: 'Moved' }]);

    expect((await http().put(`/v1/portal/blackouts/2020-01-01`).set(auth(talentUser)).send({}).expect(422)).body.error.code).toBe('PAST_DATE');
    expect((await http().put(`/v1/portal/blackouts/${confirmedDate}`).set(auth(talentUser)).send({}).expect(409)).body.error.code).toBe('HAS_BOOKING');
    await http().put('/v1/portal/blackouts/not-a-date').set(auth(talentUser)).send({}).expect(400);

    expect((await http().delete(`/v1/portal/blackouts/${d}`).set(auth(talentUser)).expect(200)).body.data).toEqual([]);
    expect(await prisma.auditLog.count({ where: { entityId: main.id, action: { in: ['blackout.add', 'blackout.remove'] } } })).toBe(3);
  });
});
