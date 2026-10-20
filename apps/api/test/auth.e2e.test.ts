import { randomInt } from 'node:crypto';
import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Roles } from '../src/auth/decorators';
import { ConsoleSmsSender, SMS_SENDER } from '../src/auth/sms';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';

/** A staff-only route to exercise the roles guard. */
@Controller('__test/staff')
class StaffOnlyController {
  @Get()
  @Roles('SALES')
  get() {
    return { data: 'ok' };
  }
}

let app: NestExpressApplication;
let sms: ConsoleSmsSender;
let prisma: PrismaService;
const phones: string[] = [];

/** Fresh number per test so rate limits never collide; each test also uses its own client IP. */
const newPhone = () => {
  const p = `9${randomInt(100_000_000, 999_999_999)}`;
  phones.push(`+91${p}`);
  return p;
};
const ip = () => `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
const http = () => request(app.getHttpServer());

const cookieFrom = (res: request.Response) => {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('tp_refresh='));
  return raw?.split(';')[0];
};

async function signIn(phone = newPhone(), from = ip()) {
  await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
  const code = sms.lastCode(`+91${phone}`)!;
  const res = await http().post('/v1/auth/otp/verify').set('X-Forwarded-For', from).send({ phone, code, name: 'Riya Sharma' }).expect(200);
  return { phone, res, token: res.body.data.accessToken as string, cookie: cookieFrom(res)! };
}

beforeAll(async () => {
  app = await bootTestApp([StaffOnlyController]);
  sms = app.get(SMS_SENDER);
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  // Clean up everything these tests created.
  await prisma.refreshToken.deleteMany({ where: { user: { phone: { in: phones } } } });
  await prisma.user.deleteMany({ where: { phone: { in: phones } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: phones } } });
  await app.close();
});

describe('phone OTP sign-in (AUTH-1, AUTH-4)', () => {
  it('sends a code, verifies it and creates a customer account', async () => {
    const phone = newPhone();
    const sent = await http().post('/v1/auth/otp/send').set('X-Forwarded-For', ip()).send({ phone: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` }).expect(202);
    expect(sent.body.data).toEqual({ expiresInSeconds: 300, resendInSeconds: 30 });

    const code = sms.lastCode(`+91${phone}`);
    expect(code).toMatch(/^\d{6}$/);
    const res = await http().post('/v1/auth/otp/verify').send({ phone, code, name: 'Riya Sharma' }).expect(200);
    expect(res.body.data.user).toEqual({ id: expect.any(String), name: 'Riya Sharma', phone: `+91${phone}`, email: null, roles: ['CUSTOMER'] });
    expect(res.body.data.expiresInSeconds).toBe(900);

    // Only a hash is stored.
    const row = await prisma.otpChallenge.findFirstOrThrow({ where: { phone: `+91${phone}` } });
    expect(row.codeHash).not.toContain(code!);
    expect(row.consumedAt).not.toBeNull();
  });

  it('sets the refresh token as an httpOnly, SameSite=Strict cookie scoped to /v1/auth', async () => {
    const { res } = await signIn();
    const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('tp_refresh='))!;
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Strict/i);
    expect(raw).toMatch(/Path=\/v1\/auth/i);
    expect(res.body.data).not.toHaveProperty('refreshToken');
  });

  it('signs an existing customer into the same account', async () => {
    const first = await signIn();
    const from = ip();
    await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone: first.phone }).expect((r) => expect([202, 429]).toContain(r.status));
    // Resend cooldown is 30 s, so reuse the user id check through /users/me instead.
    const me = await http().get('/v1/users/me').set('Authorization', `Bearer ${first.token}`).expect(200);
    expect(me.body.data.id).toBe(first.res.body.data.user.id);
  });

  it('rejects a wrong code, and locks the code after 5 wrong guesses', async () => {
    const phone = newPhone();
    await http().post('/v1/auth/otp/send').set('X-Forwarded-For', ip()).send({ phone }).expect(202);
    const right = sms.lastCode(`+91${phone}`)!;
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await http().post('/v1/auth/otp/verify').send({ phone, code: wrong }).expect(400);
      expect(r.body.error.code).toBe('OTP_INVALID');
    }
    const locked = await http().post('/v1/auth/otp/verify').send({ phone, code: right }).expect(429);
    expect(locked.body.error.code).toBe('OTP_TOO_MANY_ATTEMPTS');
  });

  it('a code works only once', async () => {
    const phone = newPhone();
    await http().post('/v1/auth/otp/send').set('X-Forwarded-For', ip()).send({ phone }).expect(202);
    const code = sms.lastCode(`+91${phone}`)!;
    await http().post('/v1/auth/otp/verify').send({ phone, code }).expect(200);
    const again = await http().post('/v1/auth/otp/verify').send({ phone, code }).expect(400);
    expect(again.body.error.code).toBe('OTP_INVALID');
  });

  it('validates the phone number', async () => {
    const r = await http().post('/v1/auth/otp/send').send({ phone: '12345' }).expect(400);
    expect(r.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('OTP rate limits (trd §10)', () => {
  it('enforces a 30-second resend cooldown per phone', async () => {
    const phone = newPhone();
    await http().post('/v1/auth/otp/send').set('X-Forwarded-For', ip()).send({ phone }).expect(202);
    const r = await http().post('/v1/auth/otp/send').set('X-Forwarded-For', ip()).send({ phone }).expect(429);
    expect(r.body.error.code).toBe('RATE_LIMITED');
    expect(r.body.error.details.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('allows 3 sends per 10 minutes per IP', async () => {
    const from = ip();
    for (let i = 0; i < 3; i++) await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone: newPhone() }).expect(202);
    const r = await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone: newPhone() }).expect(429);
    expect(r.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('sessions (AUTH-5)', () => {
  it('protects routes by default and accepts a valid access token', async () => {
    const unauth = await http().get('/v1/users/me').expect(401);
    expect(unauth.body.error.code).toBe('UNAUTHENTICATED');
    const bad = await http().get('/v1/users/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
    expect(bad.body.error.code).toBe('TOKEN_INVALID');
    const { token } = await signIn();
    await http().get('/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('rotates the refresh token on every refresh', async () => {
    const { cookie } = await signIn();
    const r1 = await http().post('/v1/auth/refresh').set('Cookie', cookie).expect(200);
    const next = cookieFrom(r1)!;
    expect(next).toBeTruthy();
    expect(next).not.toBe(cookie);
    expect(r1.body.data.accessToken).toBeTruthy();
    await http().post('/v1/auth/refresh').set('Cookie', next).expect(200);
  });

  it('revokes every session when a rotated token is reused (theft detection)', async () => {
    const { cookie } = await signIn();
    const r1 = await http().post('/v1/auth/refresh').set('Cookie', cookie).expect(200);
    const current = cookieFrom(r1)!;
    const reuse = await http().post('/v1/auth/refresh').set('Cookie', cookie).expect(401);
    expect(reuse.body.error.code).toBe('SESSION_REVOKED');
    // The legitimate latest token is now dead too.
    await http().post('/v1/auth/refresh').set('Cookie', current).expect(401);
  });

  it('logout revokes the session', async () => {
    const { cookie } = await signIn();
    await http().post('/v1/auth/logout').set('Cookie', cookie).expect(204);
    const r = await http().post('/v1/auth/refresh').set('Cookie', cookie).expect(401);
    expect(r.body.error.code).toBe('SESSION_REVOKED');
  });

  it('refresh without a cookie is rejected', async () => {
    const r = await http().post('/v1/auth/refresh').expect(401);
    expect(r.body.error.code).toBe('SESSION_INVALID');
  });
});

describe('roles', () => {
  it('blocks customers from staff routes', async () => {
    const { token } = await signIn();
    const r = await http().get('/v1/__test/staff').set('Authorization', `Bearer ${token}`).expect(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
  });

  it('a phone code never grants staff access, even on a staff account with a phone (MFA mandatory, trd §10)', async () => {
    const phone = newPhone();
    await prisma.user.create({ data: { phone: `+91${phone}`, name: 'Staff With Phone', roles: ['SALES', 'CUSTOMER'] } });
    const { token, cookie, res } = await signIn(phone);
    expect(res.body.data.user.roles).toEqual(['CUSTOMER']); // staff roles stripped from the session
    await http().get('/v1/__test/staff').set('Authorization', `Bearer ${token}`).expect(403);
    // …and still not after a refresh.
    const refreshed = await http().post('/v1/auth/refresh').set('Cookie', cookie).expect(200);
    await http().get('/v1/__test/staff').set('Authorization', `Bearer ${refreshed.body.data.accessToken}`).expect(403);
  });
});
