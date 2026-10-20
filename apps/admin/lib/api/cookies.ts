import type { NextResponse } from 'next/server';
import type { Tokens } from './server-api';

/** httpOnly session cookies on the admin origin. Strict: the admin app is never embedded or linked into. */
export const ACCESS_COOKIE = 'adm_at';
export const REFRESH_COOKIE = 'adm_rt';
const secure = process.env.NODE_ENV === 'production';
type Jar = NextResponse['cookies'];

export function setTokenCookies(jar: Jar, t: Tokens) {
  jar.set(ACCESS_COOKIE, t.accessToken, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: Math.max(t.expiresInSeconds - 30, 30) });
  // Session cookie (no maxAge): a staff session ends when the browser closes; the API caps it anyway.
  if (t.refreshToken) jar.set(REFRESH_COOKIE, t.refreshToken, { httpOnly: true, secure, sameSite: 'strict', path: '/' });
}

export function clearTokenCookies(jar: Jar) {
  jar.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
  jar.set(REFRESH_COOKIE, '', { path: '/', maxAge: 0 });
}

export const clientIp = (h: Headers) => h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || undefined;

/** True when a state-changing request comes from this site (Origin, else Referer, must match the host). */
export function sameOrigin(req: { headers: Headers; nextUrl: { host: string } }) {
  const src = req.headers.get('origin') ?? req.headers.get('referer');
  if (!src) return false;
  try {
    return new URL(src).host === (req.headers.get('x-forwarded-host') ?? req.nextUrl.host);
  } catch {
    return false;
  }
}
