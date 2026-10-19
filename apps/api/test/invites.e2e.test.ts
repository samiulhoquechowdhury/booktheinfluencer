import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConsoleSmsSender, SMS_SENDER } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';
import { STAFF_PASSWORD, staffSession } from './support/staff';

let app: NestExpressApplication;
let prisma: PrismaService;
let sms: ConsoleSmsSender;
let admin: { userId: string; token: string };
let manager: { userId: string; token: string };
let talentId: string;
const emails: string[] = [];
const phones: string[] = [];
const http = () => request(app.getHttpServer());
const as = (token: string) => ({ Authorization: `Bearer ${token}` });
const tokenOf = (url: string) => url.split('/').pop()!;
const newPhone = () => {
  const p = `8${randomInt(100_000_000, 999_999_999)}`;
  phones.push(`+91${p}`);
  return p;
};

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  sms = app.get(SMS_SENDER);
  admin = await staffSession(app, ['SUPER_ADMIN'], emails);
  manager = await staffSession(app, ['TALENT_MANAGER'], emails);
  const t = await prisma.talent.create({ data: { slug: `test-${randomUUID()}`, stageName: 'Test Talent', baseCity: 'guwahati', representationType: 'PLATFORM_COORDINATED' } });
  talentId = t.id;
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { OR: [{ email: { in: emails } }, { phone: { in: phones } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.talent.deleteMany({ where: { id: talentId } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
  await prisma.invite.deleteMany({ where: { OR: [{ invitedById: { in: ids } }, { email: { in: emails } }, { phone: { in: phones } }] } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: phones } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await app.close();
});

describe('invites (AUTH-3)', () => {
  it('a super admin invites staff by email; they set a password, then sign in with MFA', async () => {
    const email = `new-${randomUUID()}@test.local`;
    emails.push(email);
    const created = await http().post('/v1/admin/invites').set(as(admin.token)).send({ email, name: 'Priya Das', roles: ['SALES'] }).expect(201);
    expect(created.body.data.url).toMatch(/^http:\/\/localhost:3000\/invite\/[\w-]{40,}$/);
    const token = tokenOf(created.body.data.url);

    // The token itself is never stored.
    const row = await prisma.invite.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(row.tokenHash).not.toContain(token);

    const preview = await http().get(`/v1/invites/${token}`).expect(200);
    expect(preview.body.data).toMatchObject({ email, roles: ['SALES'], method: 'password', name: 'Priya Das' });

    await http().post(`/v1/invites/${token}/accept`).send({}).expect(400);
    const accepted = await http().post(`/v1/invites/${token}/accept`).send({ password: STAFF_PASSWORD }).expect(200);
    expect(accepted.body.data).toMatchObject({ nextStep: 'staff-login', user: { email, roles: ['SALES'], name: 'Priya Das' } });
    expect(accepted.body.data).not.toHaveProperty('accessToken');

    const login = await http().post('/v1/auth/login').set('X-Forwarded-For', '10.9.9.9').send({ email, password: STAFF_PASSWORD }).expect(200);
    expect(login.body.data.setup).not.toBeNull(); // MFA enrolment still required
  });

  it('a talent manager invites talent by phone; accepting proves the number and links the profile', async () => {
    const phone = newPhone();
    const created = await http().post('/v1/admin/invites').set(as(manager.token)).send({ phone, roles: ['TALENT'], talentId }).expect(201);
    const token = tokenOf(created.body.data.url);

    const preview = await http().get(`/v1/invites/${token}`).expect(200);
    expect(preview.body.data).toMatchObject({ method: 'otp', phone: `••••${phone.slice(-4)}` });

    const noCode = await http().post(`/v1/invites/${token}/accept`).send({}).expect(400);
    expect(noCode.body.error.code).toBe('CODE_REQUIRED');

    await http().post('/v1/auth/otp/send').set('X-Forwarded-For', `10.8.${randomInt(0, 250)}.1`).send({ phone }).expect(202);
    const accepted = await http().post(`/v1/invites/${token}/accept`).send({ code: sms.lastCode(`+91${phone}`), name: 'Test Talent' }).expect(200);
    expect(accepted.body.data.nextStep).toBe('signed-in');
    expect(accepted.body.data.user.roles).toEqual(['TALENT']);
    expect(accepted.body.data.accessToken).toBeTruthy();

    const talent = await prisma.talent.findUniqueOrThrow({ where: { id: talentId } });
    expect(talent.userId).toBe(accepted.body.data.user.id);
  });

  it('an invite works once, and revoked or expired invites are refused', async () => {
    const email = `once-${randomUUID()}@test.local`;
    emails.push(email);
    const a = tokenOf((await http().post('/v1/admin/invites').set(as(admin.token)).send({ email, roles: ['OPS'] }).expect(201)).body.data.url);
    await http().post(`/v1/invites/${a}/accept`).send({ password: STAFF_PASSWORD }).expect(200);
    expect((await http().post(`/v1/invites/${a}/accept`).send({ password: STAFF_PASSWORD }).expect(410)).body.error.code).toBe('INVITE_USED');

    const b = await http().post('/v1/admin/invites').set(as(admin.token)).send({ email: `rev-${randomUUID()}@test.local`, roles: ['OPS'] }).expect(201);
    await http().delete(`/v1/admin/invites/${b.body.data.id}`).set(as(admin.token)).expect(204);
    expect((await http().get(`/v1/invites/${tokenOf(b.body.data.url)}`).expect(410)).body.error.code).toBe('INVITE_REVOKED');

    const c = await http().post('/v1/admin/invites').set(as(admin.token)).send({ email: `exp-${randomUUID()}@test.local`, roles: ['OPS'] }).expect(201);
    await prisma.invite.update({ where: { id: c.body.data.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await http().get(`/v1/invites/${tokenOf(c.body.data.url)}`).expect(410)).body.error.code).toBe('INVITE_EXPIRED');

    expect((await http().get('/v1/invites/not-a-real-token').expect(404)).body.error.code).toBe('INVITE_INVALID');
  });

  it('limits who can invite whom', async () => {
    const r = await http().post('/v1/admin/invites').set(as(manager.token)).send({ email: `x-${randomUUID()}@test.local`, roles: ['SALES'] }).expect(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
    // Staff invites need an email.
    const v = await http().post('/v1/admin/invites').set(as(admin.token)).send({ phone: newPhone(), roles: ['SALES'] }).expect(400);
    expect(v.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('lists invites with their status', async () => {
    const r = await http().get('/v1/admin/invites?pageSize=50').set(as(admin.token)).expect(200);
    expect(r.body.meta).toMatchObject({ page: 1, pageSize: 50 });
    expect(r.body.data.map((i: { status: string }) => i.status)).toEqual(expect.arrayContaining(['ACCEPTED', 'REVOKED', 'EXPIRED']));
    expect(JSON.stringify(r.body)).not.toContain('tokenHash');
  });
});

describe('users & roles (T-125 API)', () => {
  it('changes roles, records before/after, and signs the person out everywhere', async () => {
    const target = await staffSession(app, ['SALES'], emails);
    const updated = await http().patch(`/v1/admin/users/${target.userId}/roles`).set(as(admin.token)).send({ roles: ['SALES', 'OPS'] }).expect(200);
    expect(updated.body.data.roles).toEqual(['SALES', 'OPS']);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: 'user.roles.update', entityId: target.userId } });
    expect(entry).toMatchObject({ actorId: admin.userId, before: { roles: ['SALES'] }, after: { roles: ['SALES', 'OPS'] } });
    expect(await prisma.refreshToken.count({ where: { userId: target.userId, revokedAt: null } })).toBe(0);
  });

  it('blocks a super admin from removing their own access', async () => {
    const r = await http().patch(`/v1/admin/users/${admin.userId}/roles`).set(as(admin.token)).send({ roles: ['SALES'] }).expect(409);
    expect(r.body.error.code).toBe('SELF_LOCKOUT');
  });

  it('is super-admin only', async () => {
    await http().get('/v1/admin/users').set(as(manager.token)).expect(403);
    const r = await http().get('/v1/admin/users').set(as(admin.token)).expect(200);
    expect(r.body.data[0]).not.toHaveProperty('passwordHash');
    expect(r.body.data[0]).not.toHaveProperty('mfaSecret');
  });
});

describe('audit log (T-126)', () => {
  it('records every admin change automatically, and never stores secrets', async () => {
    const r = await http().get(`/v1/admin/audit?actorId=${admin.userId}&pageSize=100`).set(as(admin.token)).expect(200);
    const actions = r.body.data.map((e: { action: string }) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['invite.create', 'POST /v1/admin/invites', 'DELETE /v1/admin/invites/:id', 'invite.revoke', 'user.roles.update', 'PATCH /v1/admin/users/:id/roles']));
    // The failed self-lockout attempt is recorded as an error.
    expect(r.body.data.find((e: { action: string; after: { outcome: string; status: number } }) => e.action === 'PATCH /v1/admin/users/:id/roles' && e.after.outcome === 'error')?.after.status).toBe(409);
    const all = await prisma.auditLog.findMany({ where: { action: 'invite.accept' } });
    expect(JSON.stringify(all)).not.toContain(STAFF_PASSWORD);
  });
});
