import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearTokenCookies, clientIp, setTokenCookies } from '@/lib/api/cookies';
import { refreshTokens } from '@/lib/api/server-api';

/** Every page needs a staff session (except /login and /invite/…). Renews an expired access token before rendering. */
export async function middleware(req: NextRequest) {
  // Public: sign-in, and invite links (staff set their password there before their first sign-in).
  const isLogin = req.nextUrl.pathname === '/login' || req.nextUrl.pathname.startsWith('/invite/');
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  const access = req.cookies.get(ACCESS_COOKIE)?.value;

  const toLogin = () => {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = req.nextUrl.pathname === '/' ? '' : `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    const res = NextResponse.redirect(url);
    clearTokenCookies(res.cookies);
    return res;
  };

  if (!refresh) return isLogin ? NextResponse.next() : toLogin();
  if (access) return NextResponse.next();

  const tokens = await refreshTokens(refresh, clientIp(req.headers));
  if (!tokens) return isLogin ? NextResponse.next() : toLogin();
  req.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  if (tokens.refreshToken) req.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  const res = NextResponse.next({ request: { headers: req.headers } });
  setTokenCookies(res.cookies, tokens);
  return res;
}

export const config = { matcher: ['/((?!api/|_next/|favicon|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|woff2?)$).*)'] };
