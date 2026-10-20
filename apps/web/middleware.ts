import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REAL_API, REFRESH_COOKIE } from '@/lib/api/constants';
import { refreshTokens } from '@/lib/api/real';
import { clearTokenCookies, clientIp, setTokenCookies } from '@/lib/api/token-cookies';

/**
 * Real-API mode: Server Components can't set cookies, so an expired access token is renewed here,
 * before the page renders. The new token is also passed on to this request's cookies.
 */
export async function middleware(req: NextRequest) {
  if (!REAL_API) return NextResponse.next();
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh || req.cookies.get(ACCESS_COOKIE)?.value) return NextResponse.next();

  const tokens = await refreshTokens(refresh, clientIp(req.headers));
  if (!tokens) {
    const res = NextResponse.next();
    clearTokenCookies(res.cookies);
    return res;
  }
  req.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  if (tokens.refreshToken) req.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  const res = NextResponse.next({ request: { headers: req.headers } });
  setTokenCookies(res.cookies, tokens);
  return res;
}

// Pages only: the /api/v1 proxy refreshes on its own; skip static assets.
export const config = { matcher: ['/((?!api/|_next/|favicon|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|txt|xml|woff2?)$).*)'] };
