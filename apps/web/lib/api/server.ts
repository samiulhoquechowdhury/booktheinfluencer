import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SessionRoleSchema, type SessionRole } from '@repo/schemas';
import { handle, toWire } from '@/lib/mock/router';
import { createApi } from './endpoints';
import { SESSION_COOKIE } from './constants';
import { raise, type Transport } from './transport';

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

/** Public catalogue — no cookies, so pages stay static/ISR. */
export const publicApi = createApi(inProcess('GUEST'));

/** Session-aware server API (opts the route into dynamic rendering). */
export const getSessionApi = cache(async () => {
  const jar = await cookies();
  const role = SessionRoleSchema.catch('GUEST').parse(jar.get(SESSION_COOKIE)?.value);
  return { role, api: createApi(inProcess(role)) };
});
