import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * trd §13 on-demand revalidation: the API calls this after a catalogue change (talent, photos, reps,
 * categories) so cached pages refresh within seconds. Off unless REVALIDATE_SECRET is set (server-only).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = req.headers.get('x-revalidate-secret') ?? '';
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }
  // The catalogue feeds most pages (home, listings, profiles, city pages, nav), so refresh them all.
  revalidatePath('/', 'layout');
  return NextResponse.json({ data: { revalidated: true, at: new Date().toISOString() } });
}
