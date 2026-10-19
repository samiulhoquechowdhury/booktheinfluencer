import { Body, Controller, Get, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { assertLeadTransition } from '@repo/utils';
import { Public } from '../src/auth/decorators';
import { NotFoundError } from '../src/common/errors';
import { ZodPipe } from '../src/common/zod.pipe';
import { loadEnv } from '../src/config/env';
import { bootTestApp } from './support/app';

/** Test-only routes that throw each kind of error the filter must map. */
@Public()
@Controller('__test')
class ProbeController {
  @Get('stage')
  stage() {
    assertLeadTransition('ADVANCE_PENDING', 'CONFIRMED', { actor: 'user', ownerId: 'u1', bookings: [] });
  }

  @Get('missing')
  missing() {
    throw new NotFoundError('Booking', 'BK-1');
  }

  @Get('boom')
  boom() {
    throw new Error('secret internal detail');
  }

  @Post('echo')
  echo(@Body(new ZodPipe(z.object({ name: z.string().min(2), guests: z.number().int().positive() }))) body: { name: string; guests: number }) {
    return { data: body };
  }
}

let app: NestExpressApplication;
beforeAll(async () => {
  app = await bootTestApp([ProbeController]);
});
afterAll(() => app?.close());

describe('API core', () => {
  it('GET /v1/health checks the database', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('mints a request id, or reuses a sane incoming one', async () => {
    const minted = await request(app.getHttpServer()).get('/v1/health');
    expect(minted.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const reused = await request(app.getHttpServer()).get('/v1/health').set('x-request-id', 'trace-abc-12345');
    expect(reused.headers['x-request-id']).toBe('trace-abc-12345');
    const rejected = await request(app.getHttpServer()).get('/v1/health').set('x-request-id', 'bad id!');
    expect(rejected.headers['x-request-id']).not.toBe('bad id!');
  });

  it('maps state machine errors to 409 with the transition code', async () => {
    const res = await request(app.getHttpServer()).get('/v1/__test/stage').expect(409);
    expect(res.body.error).toMatchObject({ code: 'SYSTEM_ONLY' });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('maps domain errors with their status', async () => {
    const res = await request(app.getHttpServer()).get('/v1/__test/missing').expect(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Booking BK-1 was not found.' });
  });

  it('hides internal error details', async () => {
    const res = await request(app.getHttpServer()).get('/v1/__test/boom').expect(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
  });

  it('validates bodies with Zod and lists the bad fields', async () => {
    const bad = await request(app.getHttpServer()).post('/v1/__test/echo').send({ name: 'R', guests: -2 }).expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_FAILED');
    expect(bad.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(['guests', 'name']);
    const ok = await request(app.getHttpServer()).post('/v1/__test/echo').send({ name: 'Riya', guests: 300 }).expect(201);
    expect(ok.body.data).toEqual({ name: 'Riya', guests: 300 });
  });

  it('returns the error shape for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sends security headers and only allows configured origins', async () => {
    const allowed = await request(app.getHttpServer()).get('/v1/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['x-powered-by']).toBeUndefined();
    const blocked = await request(app.getHttpServer()).get('/v1/health').set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('env validation', () => {
  it('refuses the console SMS adapter in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://a/b', REDIS_URL: 'redis://x', JWT_ACCESS_SECRET: 'x'.repeat(40), AUTH_SECRET: 'y'.repeat(40), MFA_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'), SMS_PROVIDER: 'console' })).toThrow(/SMS_PROVIDER/);
  });

  it('rejects bad values with a readable message', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://x', REDIS_URL: 'redis://x', PORT: 'abc', JWT_ACCESS_SECRET: 'x'.repeat(40), AUTH_SECRET: 'y'.repeat(40) })).toThrow(/DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/);
  });
});
