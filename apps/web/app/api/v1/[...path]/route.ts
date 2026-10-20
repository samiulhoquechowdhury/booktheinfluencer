import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REAL_API, REFRESH_COOKIE } from '@/lib/api/constants';
import { callApi, refreshFromSetCookie, refreshTokens, requestCode, sessionFor, type RawResult, type Tokens } from '@/lib/api/real';
import { clearTokenCookies, clientIp, sameOrigin, setTokenCookies } from '@/lib/api/token-cookies';
import { unwrapEnvelope } from '@/lib/api/transport';

/**
 * Browser → NestJS proxy (backend-for-frontend). Tokens stay in httpOnly cookies on this origin;
 * the proxy adds the bearer token, refreshes an expired session once, and maps the web-only
 * session paths. Only active in real-API mode (NEXT_PUBLIC_API_BASE=/api/v1).
 */
const json = (status: number, body: unknown) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** Pick up tokens from a sign-in response (OTP verify or enquiry) and hide the access token from the browser. */
function takeSession(r: RawResult): { tokens: Tokens | null; body: unknown } {
  const data = unwrapEnvelope(r.json) as Record<string, unknown> | null;
  const s = (data?.session ?? data) as { accessToken?: string; expiresInSeconds?: number } | null;
  if (r.status >= 400 || !s?.accessToken) return { tokens: null, body: r.json };
  const tokens = { accessToken: s.accessToken, expiresInSeconds: s.expiresInSeconds ?? 900, refreshToken: refreshFromSetCookie(r.setCookies) };
  const rest = Object.fromEntries(Object.entries(data as Record<string, unknown>).filter(([k]) => k !== 'session' && k !== 'accessToken'));
  return { tokens, body: { data: rest } };
}

async function dispatch(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!REAL_API) return json(404, { error: { code: 'NOT_FOUND', message: 'Real API mode is off.' } });
  // CSRF defence in depth: browsers send Origin on cross-site writes; refuse anything not from this site.
  if (req.method !== 'GET' && !sameOrigin(req)) return json(403, { error: { code: 'BAD_ORIGIN', message: 'Request refused.' } });
  const path = `/${(await ctx.params).path.map(encodeURIComponent).join('/')}`;
  const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
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

  // Web-only session paths.
  if (path === '/session' && method === 'GET') {
    await ensureToken();
    return finish(json(200, { data: await sessionFor(token) }));
  }
  if ((path === '/session/otp' || path === '/otp') && method === 'POST') {
    const r = await requestCode((body as { phone?: string } | undefined)?.phone ?? '', ip);
    return json(r.status === 202 ? 200 : r.status, r.json);
  }
  if (path === '/session/verify' && method === 'POST') {
    const r = await callApi('POST', '/auth/otp/verify', { body, ip });
    const { tokens } = takeSession(r);
    if (!tokens) return json(r.status, r.json);
    const res = json(200, { data: await sessionFor(tokens.accessToken) });
    setTokenCookies(res.cookies, tokens);
    return res;
  }
  if (path === '/session/logout' && method === 'POST') {
    if (refresh) await callApi('POST', '/auth/logout', { cookie: `tp_refresh=${refresh}`, ip });
    const res = json(200, { data: { role: 'GUEST', name: null, talentSlug: null } });
    clearTokenCookies(res.cookies);
    return res;
  }

  // Everything else goes straight through, signed in when we can be.
  await ensureToken();
  let r = await callApi(method, path, { token, body, query: Object.fromEntries(req.nextUrl.searchParams), ip });
  if (r.status === 401 && refresh && !renewed) {
    renewed = await refreshTokens(refresh, ip);
    if (renewed) {
      token = renewed.accessToken;
      r = await callApi(method, path, { token, body, query: Object.fromEntries(req.nextUrl.searchParams), ip });
    } else ended = true;
  }
  if ((path === '/enquiries' || /^\/invites\/[^/]+\/accept$/.test(path)) && method === 'POST') {
    // The enquiry signs the customer in (AUTH-4); accepting a talent / rep invite signs them in too.
    const { tokens, body: out } = takeSession(r);
    const res = json(r.status, out);
    if (tokens) setTokenCookies(res.cookies, tokens);
    return res;
  }
  return finish(r.status === 204 ? new NextResponse(null, { status: 204 }) : json(r.status, r.json));
}

export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as DELETE };
