import 'server-only';
import { env } from '@/lib/env';

/** Server-side calls to the NestJS API (proxy, middleware, Server Components). Never throws on HTTP errors. */
export type RawResult = { status: number; json: unknown; setCookies: string[] };
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const base = () => `${env.API_URL.replace(/\/$/, '')}/v1`;

export async function callApi(method: Method, path: string, o: { token?: string; body?: unknown; search?: string; cookie?: string; ip?: string } = {}): Promise<RawResult> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.token) headers.Authorization = `Bearer ${o.token}`;
  if (o.cookie) headers.Cookie = o.cookie;
  if (o.ip) headers['X-Forwarded-For'] = o.ip;
  const res = await fetch(`${base()}${path}${o.search ?? ''}`, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), cache: 'no-store' });
  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, json, setCookies: res.headers.getSetCookie() };
}

const data = <T>(json: unknown) => (json as { data: T }).data;

export type Tokens = { accessToken: string; expiresInSeconds: number; refreshToken: string | null };
export const refreshFromSetCookie = (setCookies: string[]) => setCookies.map((c) => /^tp_refresh=([^;]+)/.exec(c)?.[1]).find(Boolean) ?? null;

export async function refreshTokens(refreshToken: string, ip?: string): Promise<Tokens | null> {
  const r = await callApi('POST', '/auth/refresh', { cookie: `tp_refresh=${refreshToken}`, ip });
  if (r.status !== 200) return null;
  const d = data<{ accessToken: string; expiresInSeconds: number }>(r.json);
  return { accessToken: d.accessToken, expiresInSeconds: d.expiresInSeconds, refreshToken: refreshFromSetCookie(r.setCookies) };
}

export const STAFF_ROLES = ['SUPER_ADMIN', 'SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type StaffUser = { id: string; name: string | null; email: string | null; roles: StaffRole[] };

/** The signed-in staff member, or null (no session, or not a staff account). */
export async function staffFor(token: string | undefined): Promise<StaffUser | null> {
  if (!token) return null;
  const r = await callApi('GET', '/users/me', { token });
  if (r.status !== 200) return null;
  const u = data<{ id: string; name: string | null; email: string | null; roles: string[] }>(r.json);
  const roles = u.roles.filter((x): x is StaffRole => (STAFF_ROLES as readonly string[]).includes(x));
  return roles.length ? { id: u.id, name: u.name, email: u.email, roles } : null;
}
