import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SessionRoleSchema, type SessionRole } from '@repo/schemas';
import { handle, toWire } from '@/lib/mock/router';
import { createApi } from './endpoints';
import { ACCESS_COOKIE, REAL_API, SESSION_COOKIE } from './constants';
import { realTransport, sessionFor } from './real';
import { env } from '@/lib/env';
import { httpTransport, raise, type Transport } from './transport';

/**
 * Server API client for Server Components / SSG. In-process call into the mock router with the
 * same wire format as HTTP. Later: swap for httpTransport(process.env.API_URL) + auth header.
 */
const inProcess =
  (role: SessionRole): Transport =>
  async ({ method, path, query, body }) => {
    const q = Object.fromEntries(Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
    const res = handle({ method, path, query: q, body: toWire(body), role });
    const wire = toWire(res.body);
    if (res.status >= 400) raise(res.status, wire);
    return wire;
  };

/**
 * Migration switch: with API_URL set, the public catalogue (`/talents…`) comes from the NestJS API;
 * everything else stays on the mock until those API modules exist. Without API_URL: all mock.
 */
const withRealCatalogue = (fallback: Transport): Transport => {
  if (!env.API_URL) return fallback;
  const real = httpTransport(`${env.API_URL.replace(/\/$/, '')}/v1`);
  return (req) => (req.path.startsWith('/talents') ? real(req) : fallback(req));
};

/** Public catalogue — no cookies, so pages stay static/ISR. */
export const publicApi = createApi(REAL_API ? realTransport() : withRealCatalogue(inProcess('GUEST')));

/** Session-aware server API (opts the route into dynamic rendering). */
export const getSessionApi = cache(async () => {
  const jar = await cookies();
  if (REAL_API) {
    // middleware.ts has already renewed an expired access token for this request.
    const token = jar.get(ACCESS_COOKIE)?.value;
    const session = await sessionFor(token);
    return { role: session.role, api: createApi(realTransport(token)) };
  }
  const role = SessionRoleSchema.catch('GUEST').parse(jar.get(SESSION_COOKIE)?.value);
  return { role, api: createApi(inProcess(role)) };
});
