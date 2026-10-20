import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearTokenCookies, clientIp, sameOrigin, setTokenCookies } from '@/lib/api/cookies';
import { callApi, refreshFromSetCookie, refreshTokens, staffFor, type Tokens } from '@/lib/api/server-api';

/**
 * Browser → NestJS proxy for the admin app. Tokens stay in httpOnly cookies here; staff sign-in is
 * password then authenticator code (AUTH-2). Only staff accounts get a session.
 */
const json = (status: number, body: unknown) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function dispatch(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const path = `/${(await ctx.params).path.map(encodeURIComponent).join('/')}`;
  if (req.method !== 'GET' && !sameOrigin(req)) return json(403, { error: { code: 'BAD_ORIGIN', message: 'Request refused.' } });
  const method = req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  const body = method === 'GET' || method === 'DELETE' ? undefined : await req.json().catch(() => undefined);
  const ip = clientIp(req.headers);
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  let token = req.cookies.get(ACCESS_COOKIE)?.value;
  let renewed: Tokens | null = null;
  let ended = false;

  const ensureToken = async () => {
    if (token || !refresh) return;
    renewed = await refreshTokens(refresh, ip);
    if (renewed) token = renewed.accessToken;
    else ended = true;
  };
  const finish = (res: NextResponse) => {
    if (renewed) setTokenCookies(res.cookies, renewed);
    else if (ended) clearTokenCookies(res.cookies);
    return res;
  };

  if (path === '/session' && method === 'GET') {
    await ensureToken();
    return finish(json(200, { data: { user: await staffFor(token) } }));
  }
  if (path === '/session/login' && method === 'POST') {
    const r = await callApi('POST', '/auth/login', { body, ip });
    return json(r.status, r.json);
  }
  if (path === '/session/mfa' && method === 'POST') {
    const r = await callApi('POST', '/auth/mfa/verify', { body, ip });
    if (r.status !== 200) return json(r.status, r.json);
    const d = (r.json as { data: { accessToken: string; expiresInSeconds: number } }).data;
    const tokens = { accessToken: d.accessToken, expiresInSeconds: d.expiresInSeconds, refreshToken: refreshFromSetCookie(r.setCookies) };
    const user = await staffFor(tokens.accessToken);
    if (!user) {
      // A customer or talent account has no business here; end the session we just got.
      if (tokens.refreshToken) await callApi('POST', '/auth/logout', { cookie: `tp_refresh=${tokens.refreshToken}`, ip });
      return json(403, { error: { code: 'NOT_STAFF', message: 'This account doesn’t have staff access.' } });
    }
    const res = json(200, { data: { user } });
    setTokenCookies(res.cookies, tokens);
    return res;
  }
  if (path === '/session/logout' && method === 'POST') {
    if (refresh) await callApi('POST', '/auth/logout', { cookie: `tp_refresh=${refresh}`, ip });
    const res = json(200, { data: { user: null } });
    clearTokenCookies(res.cookies);
    return res;
  }

  await ensureToken();
  const search = req.nextUrl.search;
  let r = await callApi(method, path, { token, body, search, ip });
  if (r.status === 401 && refresh && !renewed) {
    renewed = await refreshTokens(refresh, ip);
    if (renewed) {
      token = renewed.accessToken;
      r = await callApi(method, path, { token, body, search, ip });
    } else ended = true;
  }
  return finish(r.status === 204 ? new NextResponse(null, { status: 204 }) : json(r.status, r.json));
}

export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as PATCH, dispatch as DELETE };
