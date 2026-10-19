import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '@repo/db';
import { currentStep, totpAt } from '../src/auth/totp';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';

let app: NestExpressApplication;
let prisma: PrismaService;
const emails: string[] = [];
const PASSWORD = 'correct-horse-battery-1';
const http = () => request(app.getHttpServer());
const ip = () => `172.16.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 250)}`;

async function makeUser(roles: ('SALES' | 'CUSTOMER' | 'ACCOUNTS')[] = ['SALES']) {
  const email = `staff-${randomUUID()}@test.local`;
  emails.push(email);
  await prisma.user.create({ data: { email, name: 'Test Staff', roles, passwordHash: await hashPassword(PASSWORD) } });
  return email;
}

/** Full first sign-in: password → setup → code. Returns the secret for later sign-ins. */
async function enrol(email: string, from = ip()) {
  const step1 = await http().post('/v1/auth/login').set('X-Forwarded-For', from).send({ email, password: PASSWORD }).expect(200);
  const { mfaToken, setup } = step1.body.data;
  const code = totpAt(setup.secret, currentStep());
  const step2 = await http().post('/v1/auth/mfa/verify').set('X-Forwarded-For', from).send({ mfaToken, code }).expect(200);
  return { secret: setup.secret as string, session: step2 };
}

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await app.close();
});

describe('staff sign-in (AUTH-2)', () => {
  it('first sign-in requires authenticator setup, then issues a staff session', async () => {
    const email = await makeUser();
    const step1 = await http().post('/v1/auth/login').set('X-Forwarded-For', ip()).send({ email: email.toUpperCase(), password: PASSWORD }).expect(200);
    expect(step1.body.data.setup.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(step1.body.data.setup.otpauthUrl).toContain('otpauth://totp/BookTheInfluencer');
    expect(step1.body.data).not.toHaveProperty('accessToken');

    // Stored secret is encrypted, and MFA isn't "enabled" until a code verifies.
    const before = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(before.mfaSecret).not.toContain(step1.body.data.setup.secret);
    expect(before.mfaEnabledAt).toBeNull();

    const code = totpAt(step1.body.data.setup.secret, currentStep());
    const step2 = await http().post('/v1/auth/mfa/verify').send({ mfaToken: step1.body.data.mfaToken, code }).expect(200);
    expect(step2.body.data.user.roles).toEqual(['SALES']);
    expect(([] as string[]).concat(step2.headers['set-cookie'] ?? []).some((c) => c.startsWith('tp_refresh='))).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).mfaEnabledAt).not.toBeNull();

    await http().get('/v1/users/me').set('Authorization', `Bearer ${step2.body.data.accessToken}`).expect(200);
  });

  it('later sign-ins ask for a code without a new setup', async () => {
    const email = await makeUser();
    const { secret } = await enrol(email);
    const step1 = await http().post('/v1/auth/login').set('X-Forwarded-For', ip()).send({ email, password: PASSWORD }).expect(200);
    expect(step1.body.data.setup).toBeNull();
    // The code from enrolment was just used, so wait for the next step's code.
    const code = totpAt(secret, currentStep() + 1);
    await http().post('/v1/auth/mfa/verify').send({ mfaToken: step1.body.data.mfaToken, code }).expect(200);
  });

  it('refuses a replayed code', async () => {
    const email = await makeUser();
    const { secret } = await enrol(email);
    const step1 = await http().post('/v1/auth/login').set('X-Forwarded-For', ip()).send({ email, password: PASSWORD }).expect(200);
    const used = totpAt(secret, currentStep());
    const r = await http().post('/v1/auth/mfa/verify').send({ mfaToken: step1.body.data.mfaToken, code: used }).expect(400);
    expect(r.body.error.code).toBe('MFA_INVALID');
  });

  it('gives the same answer for a wrong password, an unknown email and a customer account', async () => {
    const staff = await makeUser();
    const customer = await makeUser(['CUSTOMER']);
    for (const body of [{ email: staff, password: 'wrong-password-123' }, { email: `nobody-${randomUUID()}@test.local`, password: PASSWORD }, { email: customer, password: PASSWORD }]) {
      const r = await http().post('/v1/auth/login').set('X-Forwarded-For', ip()).send(body).expect(401);
      expect(r.body.error).toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    }
  });

  it('an MFA token is not a sign-in token, and an access token is not an MFA token', async () => {
    const email = await makeUser();
    const step1 = await http().post('/v1/auth/login').set('X-Forwarded-For', ip()).send({ email, password: PASSWORD }).expect(200);
    const asAccess = await http().get('/v1/users/me').set('Authorization', `Bearer ${step1.body.data.mfaToken}`).expect(401);
    expect(asAccess.body.error.code).toBe('TOKEN_INVALID');

    const { session } = await enrol(await makeUser());
    const asMfa = await http().post('/v1/auth/mfa/verify').send({ mfaToken: session.body.data.accessToken, code: '123456' }).expect(401);
    expect(asMfa.body.error.code).toBe('MFA_TOKEN_INVALID');
  });

  it('locks sign-in after 10 failed attempts per email (trd §10)', async () => {
    const email = await makeUser();
    for (let i = 0; i < 10; i++) await http().post('/v1/auth/login').set('X-Forwarded-For', ip()).send({ email, password: 'wrong-password-123' }).expect(401);
    const r = await http().post('/v1/auth/login').set('X-Forwarded-For', ip()).send({ email, password: PASSWORD }).expect(429);
    expect(r.body.error.code).toBe('RATE_LIMITED');
  });
});
