import 'server-only';
import type { Session } from '@repo/schemas';
import { env } from '@/lib/env';
import { raise, toSearch, unwrapEnvelope, type ApiRequest, type Transport } from './transport';

/**
 * Server-side client for the NestJS API (used by Server Components, the /api/v1 proxy and
 * middleware). Web-only paths are mapped here so the UI's endpoint list stays unchanged.
 */
export const apiBase = () => `${env.API_URL!.replace(/\/$/, '')}/v1`;

export type RawResult = { status: number; json: unknown; setCookies: string[] };

/** One HTTP call to the API, without throwing. */
export async function callApi(method: ApiRequest['method'], path: string, o: { token?: string; body?: unknown; query?: ApiRequest['query']; cookie?: string; ip?: string } = {}): Promise<RawResult> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.token) headers.Authorization = `Bearer ${o.token}`;
  if (o.cookie) headers.Cookie = o.cookie;
  // The API rate-limits per client IP; pass the visitor's address on (API trusts one proxy hop).
  if (o.ip) headers['X-Forwarded-For'] = o.ip;
  const res = await fetch(`${apiBase()}${path}${toSearch(o.query)}`, {
    method,
    headers,
    body: o.body === undefined ? undefined : JSON.stringify(o.body, (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
    cache: 'no-store',
  });
  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, json, setCookies: res.headers.getSetCookie() };
}

/** The rotated refresh token from the API's Set-Cookie (`tp_refresh=…`). */
export const refreshFromSetCookie = (setCookies: string[]) => setCookies.map((c) => /^tp_refresh=([^;]+)/.exec(c)?.[1]).find(Boolean) ?? null;

export type Tokens = { accessToken: string; expiresInSeconds: number; refreshToken: string | null };

/** Trade a refresh token for a new pair. null = the session is over. */
export async function refreshTokens(refreshToken: string, ip?: string): Promise<Tokens | null> {
  const r = await callApi('POST', '/auth/refresh', { cookie: `tp_refresh=${refreshToken}`, ip });
  if (r.status !== 200) return null;
  const data = unwrapEnvelope(r.json) as { accessToken: string; expiresInSeconds: number };
  return { accessToken: data.accessToken, expiresInSeconds: data.expiresInSeconds, refreshToken: refreshFromSetCookie(r.setCookies) };
}

const GUEST: Session = { role: 'GUEST', name: null, talentSlug: null };

/** The web's session shape from the API account (staff-only accounts are guests on the website). */
export async function sessionFor(token: string | undefined): Promise<Session> {
  if (!token) return GUEST;
  const me = await callApi('GET', '/users/me', { token });
  if (me.status !== 200) return GUEST;
  const u = unwrapEnvelope(me.json) as { name: string | null; roles: string[] };
  if (u.roles.includes('TALENT') || u.roles.includes('REP')) {
    const p = await callApi('GET', '/portal', { token });
    const slug = p.status === 200 ? (unwrapEnvelope(p.json) as { talentSlug: string }).talentSlug : null;
    return { role: 'TALENT', name: u.name, talentSlug: slug };
  }
  return u.roles.includes('CUSTOMER') ? { role: 'CUSTOMER', name: u.name, talentSlug: null } : GUEST;
}

/** OTP send, in the shape the web's forms expect. */
export async function requestCode(phone: string, ip?: string) {
  const r = await callApi('POST', '/auth/otp/send', { body: { phone }, ip });
  if (r.status >= 400) return r;
  const d = unwrapEnvelope(r.json) as { resendInSeconds: number };
  const devHint = process.env.NODE_ENV === 'production' ? undefined : 'Development: the code is printed in the API console.';
  return { ...r, json: { data: { sent: true, resendInSeconds: d.resendInSeconds, ...(devHint ? { devHint } : {}) } } };
}

/** Transport for Server Components: signed in with the cookie's access token (read-only calls). */
export const realTransport =
  (token?: string): Transport =>
  async ({ method, path, query, body }) => {
    if (path === '/session' && method === 'GET') return sessionFor(token);
    const r = await callApi(method, path, { token, query, body });
    if (r.status >= 400) raise(r.status, r.json);
    return unwrapEnvelope(r.json);
  };
