import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../config/env';
import { RevalidateWebInterceptor } from './revalidate-web.interceptor';

const ctx = (method: string) => ({ switchToHttp: () => ({ getRequest: () => ({ method }) }) }) as unknown as ExecutionContext;
const next = (ok = true): CallHandler => ({ handle: () => (ok ? of({ data: 'saved' }) : throwError(() => new Error('nope'))) });
const env = { WEB_REVALIDATE_URL: 'https://web.test/api/revalidate', REVALIDATE_SECRET: 's'.repeat(40) } as Env;
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.unstubAllGlobals());

describe('RevalidateWebInterceptor', () => {
  it('pings the website with the secret after a successful change', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);
    expect(await lastValueFrom(new RevalidateWebInterceptor(env).intercept(ctx('PATCH'), next()))).toEqual({ data: 'saved' });
    await flush();
    expect(fetch).toHaveBeenCalledWith(env.WEB_REVALIDATE_URL, expect.objectContaining({ method: 'POST', headers: { 'x-revalidate-secret': env.REVALIDATE_SECRET } }));
  });

  it('stays quiet on reads, on failed changes, and when not configured', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);
    await lastValueFrom(new RevalidateWebInterceptor(env).intercept(ctx('GET'), next()));
    await expect(lastValueFrom(new RevalidateWebInterceptor(env).intercept(ctx('POST'), next(false)))).rejects.toThrow('nope');
    await lastValueFrom(new RevalidateWebInterceptor({} as Env).intercept(ctx('POST'), next()));
    await flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never fails the save when the website is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect(await lastValueFrom(new RevalidateWebInterceptor(env).intercept(ctx('PUT'), next()))).toEqual({ data: 'saved' });
    await flush();
  });
});
