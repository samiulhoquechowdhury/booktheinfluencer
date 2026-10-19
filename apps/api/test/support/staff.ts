import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hashPassword, type Role } from '@repo/db';
import { currentStep, totpAt } from '../../src/auth/totp';
import { PrismaService } from '../../src/prisma/prisma.service';

export const STAFF_PASSWORD = 'correct-horse-battery-1';

/** Creates a staff user and completes password + TOTP sign-in. Returns the access token. */
export async function staffSession(app: NestExpressApplication, roles: Role[], track: string[]) {
  const prisma = app.get(PrismaService);
  const email = `staff-${randomUUID()}@test.local`;
  track.push(email);
  const user = await prisma.user.create({ data: { email, name: 'Test Staff', roles, passwordHash: await hashPassword(STAFF_PASSWORD) } });
  const http = request(app.getHttpServer());
  const step1 = await http.post('/v1/auth/login').set('X-Forwarded-For', `192.168.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`).send({ email, password: STAFF_PASSWORD });
  const { mfaToken, setup } = step1.body.data;
  const step2 = await request(app.getHttpServer()).post('/v1/auth/mfa/verify').send({ mfaToken, code: totpAt(setup.secret, currentStep()) });
  return { userId: user.id, email, token: step2.body.data.accessToken as string };
}
