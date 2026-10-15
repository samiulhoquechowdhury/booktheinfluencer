import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SessionRoleSchema } from '@repo/schemas';
import { handle, toWire } from '@/lib/mock/router';
import { FAIL_COOKIE, SESSION_COOKIE } from '@/lib/api/constants';

/** Mock API endpoint for client-side calls. Adds network latency and optional failure injection. */
async function dispatch(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const jar = await cookies();
  const role = SessionRoleSchema.catch('GUEST').parse(jar.get(SESSION_COOKIE)?.value);
  const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
  const body = method === 'GET' ? undefined : await req.json().catch(() => undefined);

  await new Promise((r) => setTimeout(r, 250 + Math.random() * 450));

  if (jar.get(FAIL_COOKIE)?.value === '1' && method === 'GET' && path[0] !== 'session') {
    return NextResponse.json({ error: { code: 'MOCK_FAILURE', message: 'Simulated network error (demo toggle).' } }, { status: 503 });
  }

  const res = handle({ method, path: path.join('/'), query: Object.fromEntries(req.nextUrl.searchParams), body, role });
  const out = NextResponse.json(toWire(res.body), { status: res.status, headers: { 'Cache-Control': 'no-store' } });

  if (path[0] === 'session' && method === 'POST' && res.status === 200) {
    out.cookies.set(SESSION_COOKIE, (res.body as { role: string }).role, { path: '/', sameSite: 'lax', httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
  }
  return out;
}

export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as DELETE };
