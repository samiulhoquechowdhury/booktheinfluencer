import { type DynamicModule, Module, type Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../src/app.module';
import { createApp } from '../../src/bootstrap';
import { loadEnv } from '../../src/config/env';

/**
 * Tests only ever touch a `*_test` database. Deliberately not DATABASE_URL: Prisma loads
 * packages/db/.env into process.env, which points at the dev database.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://talent:talent@localhost:5440/talent_test?schema=public';
if (!/\/[\w-]*_test(\?|$)/.test(TEST_DATABASE_URL)) throw new Error('TEST_DATABASE_URL must name a *_test database');

/** Test env: the separate talent_test database (never the dev data), silent logs. */
export const testEnv = loadEnv({
  ...process.env,
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: TEST_DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6390',
  CORS_ORIGINS: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdefghijklmnop',
  AUTH_SECRET: 'test-auth-secret-0123456789abcdefghijklmnopqr',
  SMS_PROVIDER: 'console',
  OTP_ACCEPT_ANY: 'false', // the dev .env may turn the demo bypass on
  MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  PAYMENT_WEBHOOK_SECRET: 'test-payment-webhook-secret-0123456789abc',
  ESIGN_WEBHOOK_SECRET: 'test-esign-webhook-secret-0123456789abcdef',
});

/** Boots the real app plus optional test-only controllers. */
export async function bootTestApp(controllers: Type[] = []): Promise<NestExpressApplication> {
  @Module({ imports: [AppModule.forRoot(testEnv)], controllers })
  class TestRoot {}
  const app = await createApp(testEnv, { module: TestRoot } satisfies DynamicModule);
  await app.init();
  return app;
}
