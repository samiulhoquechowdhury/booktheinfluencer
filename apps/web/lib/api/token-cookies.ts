import type { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './constants';
import type { Tokens } from './real';

type ResponseCookies = NextResponse['cookies'];

const secure = process.env.NODE_ENV === 'production';
const REFRESH_MAX_AGE = 30 * 86_400; // matches the API's refresh lifetime

/** Store tokens as httpOnly cookies. The access cookie expires a little before the token does. */
export function setTokenCookies(jar: ResponseCookies, t: Tokens) {
  jar.set(ACCESS_COOKIE, t.accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: Math.max(t.expiresInSeconds - 30, 30) });
  if (t.refreshToken) jar.set(REFRESH_COOKIE, t.refreshToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: REFRESH_MAX_AGE });
}

export function clearTokenCookies(jar: ResponseCookies) {
  jar.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
  jar.set(REFRESH_COOKIE, '', { path: '/', maxAge: 0 });
}

/** Visitor IP for the API's per-IP limits (first X-Forwarded-For hop, as set by the host). */
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
