import 'server-only';
import {
  ContactMessageSchema,
  EnquirySchema,
  OtpRequestSchema,
  QuoteDecisionSchema,
  SessionRoleSchema,
  TalentQuerySchema,
  type SessionRole,
  type TalentQueryParsed,
} from '@repo/schemas';
import { applyBps, rupeesToPaise, todayIST } from '@repo/utils';
import { db, type RawBooking, type RawTalent } from './db';
import {
  toCustomerBooking,
  toCustomerBookingSummary,
  toPublicTalent,
  toTalentBooking,
  toTalentPayout,
} from './serializers';

/**
 * Mock REST router. Mirrors the future NestJS API (`/v1/...`) closely enough that
 * lib/api can swap transports without UI changes. Enforces role checks like the real API.
 */
export type MockRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  role: SessionRole;
};
export type MockResponse = { status: number; body: unknown };

const ok = (body: unknown, status = 200): MockResponse => ({ status, body });
const err = (status: number, code: string, message: string): MockResponse => ({
  status,
  body: { error: { code, message } },
});

const LAKH = rupeesToPaise(100_000);
const BUDGETS: Record<string, [bigint, bigint]> = {
  under_1l: [0n, LAKH],
  '1l_3l': [LAKH, 3n * LAKH],
  '3l_10l': [3n * LAKH, 10n * LAKH],
  above_10l: [10n * LAKH, 10n ** 15n],
};

function parseQuery(q: Record<string, string | undefined>): TalentQueryParsed {
  return TalentQuerySchema.parse({
    q: q.q || undefined,
    category: q.category || undefined,
    city: q.city || undefined,
    date: q.date || undefined,
    eventType: q.eventType || undefined,
    language: q.language || undefined,
    budget: q.budget || undefined,
    verified: q.verified === 'true' ? true : undefined,
    sort: q.sort || undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
}

function relevance(t: RawTalent) {
  return (t.featured ? 4 : 0) + (t.tier === 'PREMIUM' ? 2 : 0) + (t.verified ? 1 : 0);
}

function searchTalents(query: TalentQueryParsed) {
  const { talents, blackouts } = db();
  const needle = query.q?.toLowerCase();
  let list = talents.filter((t) => {
    if (query.category && !(t.categories as string[]).includes(query.category)) return false;
    if (query.city && t.baseCity !== query.city && !t.travelsPanIndia && !(t.travelsTo as string[]).includes(query.city)) return false;
    if (query.eventType && !(t.eventTypes as string[]).includes(query.eventType)) return false;
    if (query.language && !(t.languages as string[]).includes(query.language)) return false;
    if (query.verified && !t.verified) return false;
    // CAT-4: blackout hides the talent on that date — it never implies availability.
    if (query.date && blackouts[t.slug]?.includes(query.date)) return false;
    if (query.budget) {
      const [lo, hi] = BUDGETS[query.budget]!;
      if (!t.feeBand) return query.budget === 'above_10l';
      const min = BigInt(t.feeBand.minPaise);
      const max = BigInt(t.feeBand.maxPaise);
      if (max < lo || min >= hi) return false;
    }
    if (needle) {
      const hay = `${t.name} ${t.tagline} ${t.bio} ${t.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  const fee = (t: RawTalent) => (t.feeBand ? BigInt(t.feeBand.minPaise) : null);
  list = list.slice().sort((a, b) => {
    if (query.sort === 'relevance') return relevance(b) - relevance(a) || a.name.localeCompare(b.name);
    const fa = fee(a);
    const fb = fee(b);
    if (fa === null) return 1; // "On request" always last
    if (fb === null) return -1;
    const d = query.sort === 'fee_asc' ? fa - fb : fb - fa;
    return d === 0n ? 0 : d > 0n ? 1 : -1;
  });
  const start = (query.page - 1) * query.pageSize;
  return {
    items: list.slice(start, start + query.pageSize).map(toPublicTalent),
    total: list.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

const requireRole = (role: SessionRole, need: SessionRole) =>
  role === need ? null : role === 'GUEST' ? err(401, 'UNAUTHENTICATED', 'Please log in to continue.') : err(403, 'FORBIDDEN', 'This area is not available for your account.');

const SESSION_NAMES: Record<SessionRole, string | null> = { GUEST: null, CUSTOMER: 'Riya Sharma', TALENT: 'Papon' };

function nextRef(prefix: string) {
  const d = db();
  d.seq += 1;
  return `${prefix}-${d.seq}`;
}

function findBooking(ref: string): RawBooking | undefined {
  return db().bookings.find((b) => b.ref === ref);
}

export function handle(req: MockRequest): MockResponse {
  const { method, role } = req;
  const parts = req.path.replace(/^\/+|\/+$/g, '').split('/');
  const q = req.query ?? {};
  const d = db();

  try {
    // ---------- Session ----------
    if (parts[0] === 'session') {
      if (method === 'GET') return ok({ role, name: SESSION_NAMES[role], talentSlug: role === 'TALENT' ? d.portal.talentSlug : null });
      if (method === 'POST') {
        const r = SessionRoleSchema.parse((req.body as { role?: unknown })?.role);
        return ok({ role: r, name: SESSION_NAMES[r], talentSlug: r === 'TALENT' ? d.portal.talentSlug : null });
      }
    }

    // ---------- Catalogue (public) ----------
    if (parts[0] === 'talents') {
      if (parts.length === 1 && method === 'GET') return ok(searchTalents(parseQuery(q)));
      if (parts[1] === 'featured' && method === 'GET') {
        return ok(d.talents.filter((t) => t.featured).map(toPublicTalent));
      }
      const t = d.talents.find((x) => x.slug === parts[1]);
      if (!t) return err(404, 'TALENT_NOT_FOUND', 'We couldn’t find that profile.');
      if (parts.length === 2 && method === 'GET') return ok(toPublicTalent(t));
      if (parts[2] === 'similar' && method === 'GET') {
        const similar = d.talents
          .filter((x) => x.slug !== t.slug && x.primaryCategory === t.primaryCategory)
          .sort((a, b) => Number(b.baseCity === t.baseCity) - Number(a.baseCity === t.baseCity) || relevance(b) - relevance(a))
          .slice(0, 4);
        return ok(similar.map(toPublicTalent));
      }
    }

    // ---------- OTP + enquiry (guest allowed) ----------
    if (parts[0] === 'otp' && method === 'POST') {
      OtpRequestSchema.parse(req.body);
      return ok({ sent: true, resendInSeconds: 30, devHint: 'Demo code: 123456' });
    }
    if (parts[0] === 'enquiries' && method === 'POST') {
      const input = EnquirySchema.parse(req.body);
      if (input.contact.otp !== '123456') return err(422, 'OTP_INVALID', 'That code didn’t match. Try 123456 in this demo.');
      const leadRef = nextRef('LD');
      const event = {
        type: input.event.eventType,
        title: `${input.event.eventType.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} — ${input.contact.company || input.contact.name}`,
        date: input.event.date,
        startTime: '19:00',
        city: input.event.city,
        venue: input.event.venue,
        audienceSize: input.event.audienceSize,
        durationMins: input.event.durationMins,
      };
      const now = new Date().toISOString();
      const bookingRefs: string[] = [];
      for (const slug of input.talent.talentSlugs) {
        const t = d.talents.find((x) => x.slug === slug);
        if (!t) continue;
        const ref = nextRef('BK');
        bookingRefs.push(ref);
        d.bookings.unshift({
          ref,
          leadRef,
          stage: 'NEW',
          availability: 'NOT_CHECKED',
          talent: { slug: t.slug, name: t.name, primaryCategory: t.primaryCategory, image: t.images[0]! },
          event,
          createdAt: now,
          quotes: [],
          contract: { status: 'NOT_SENT', sentAt: null, signedAt: null },
          advancePaid: false,
          milestones: [],
          documents: [],
          activity: [{ at: now, label: 'Brief received' }],
          notes: input.talent.notes || null,
          manager: d.bookings[0]!.manager,
          internal: { owner: 'unassigned', leadScore: 50 },
        } as unknown as RawBooking);
      }
      if (bookingRefs.length === 0) d.briefs.unshift({ ref: leadRef, event, createdAt: now, contact: input.contact });
      return ok({ ref: leadRef, bookingRefs, expectedResponseHours: 24 }, 201);
    }

    if (parts[0] === 'contact' && method === 'POST') {
      ContactMessageSchema.parse(req.body);
      return ok({ ref: nextRef('MSG') }, 201);
    }

    // ---------- Customer ----------
    if (parts[0] === 'me') {
      const denied = requireRole(role, 'CUSTOMER');
      if (denied) return denied;

      if (parts[1] === 'favourites') {
        if (parts.length === 2 && method === 'GET') {
          return ok(d.talents.filter((t) => d.favourites.has(t.slug)).map(toPublicTalent));
        }
        const slug = parts[2];
        if (!slug || !d.talents.some((t) => t.slug === slug)) return err(404, 'TALENT_NOT_FOUND', 'Unknown talent.');
        if (method === 'PUT') d.favourites.add(slug);
        else if (method === 'DELETE') d.favourites.delete(slug);
        return ok({ slug, favourite: d.favourites.has(slug) });
      }

      if (parts[1] === 'bookings') {
        if (parts.length === 2 && method === 'GET') {
          return ok({
            bookings: d.bookings.map(toCustomerBookingSummary),
            briefs: d.briefs.map((b) => ({ ref: b.ref, event: b.event, createdAt: b.createdAt })),
          });
        }
        const b = findBooking(parts[2] ?? '');
        if (!b) return err(404, 'BOOKING_NOT_FOUND', 'We couldn’t find that booking.');
        if (parts.length === 3 && method === 'GET') return ok(toCustomerBooking(b));

        // POST /me/bookings/:ref/quotes/:id/decision
        if (parts[3] === 'quotes' && parts[5] === 'decision' && method === 'POST') {
          const quote = b.quotes.find((x) => x.id === parts[4]);
          if (!quote) return err(404, 'QUOTE_NOT_FOUND', 'Quote not found.');
          if (quote.status !== 'SENT') return err(409, 'QUOTE_NOT_OPEN', 'This quote is no longer open.');
          if (new Date(quote.validUntil).getTime() < Date.now()) {
            quote.status = 'EXPIRED';
            return err(409, 'QUOTE_EXPIRED', 'This quote has expired. Ask your manager for a revised one.');
          }
          const decision = QuoteDecisionSchema.parse(req.body);
          const now = new Date().toISOString();
          if (decision.action === 'accept') {
            // QUO-7: record acceptance (real API also stores IP + user). Not CONFIRMED — trd §5.
            quote.status = 'ACCEPTED';
            quote.acceptedAt = now;
            b.stage = 'ADVANCE_PENDING';
            const total = BigInt(quote.totalPaise);
            let allocated = 0n;
            b.milestones = quote.milestones.map((m, i, arr) => {
              const amount = i === arr.length - 1 ? total - allocated : applyBps(total, m.percentBps);
              allocated += amount;
              return { id: `m_${m.id}`, label: `${m.label} (${m.percentBps / 100}%)`, amountPaise: amount.toString(), dueDate: m.dueDate, status: i === 0 ? 'DUE' : 'UPCOMING', paidAt: null, receiptNo: null };
            }) as unknown as RawBooking['milestones'];
            b.activity.push({ at: now, label: `You accepted quote v${quote.version}` });
            b.activity.push({ at: now, label: 'Contract being prepared by your manager' });
          } else {
            quote.status = 'CHANGES_REQUESTED';
            quote.changeRequest = decision.message;
            b.stage = 'NEGOTIATION';
            b.activity.push({ at: now, label: `You requested changes to quote v${quote.version}` });
          }
          return ok(toCustomerBooking(b));
        }

        // POST /me/bookings/:ref/milestones/:id/pay → payment link only. State changes come from
        // verified gateway webhooks, never the client (rules.md §0.4).
        if (parts[3] === 'milestones' && parts[5] === 'pay' && method === 'POST') {
          const m = (b.milestones as { id: string; amountPaise: string; status: string }[]).find((x) => x.id === parts[4]);
          if (!m) return err(404, 'MILESTONE_NOT_FOUND', 'Payment not found.');
          if (m.status === 'PAID') return err(409, 'ALREADY_PAID', 'This payment is already complete.');
          return ok({ milestoneId: m.id, amountPaise: m.amountPaise, checkoutUrl: null, message: 'Demo mode: the secure payment link would open in the payment gateway (UPI, cards, net banking). Status updates only after the gateway confirms.' });
        }
      }
    }

    // ---------- Talent portal ----------
    if (parts[0] === 'portal') {
      const denied = requireRole(role, 'TALENT');
      if (denied) return denied;
      const p = d.portal;
      if (parts.length === 1 && method === 'GET') return ok({ talentSlug: p.talentSlug, name: p.name, blackoutEditable: p.blackoutEditable });
      if (parts[1] === 'bookings' && method === 'GET') return ok(p.bookings.map(toTalentBooking));
      if (parts[1] === 'payouts' && method === 'GET') return ok(p.payouts.map(toTalentPayout));
      if (parts[1] === 'blackouts') {
        if (parts.length === 2 && method === 'GET') return ok(p.blackouts.slice().sort((a, b) => a.date.localeCompare(b.date)));
        const date = parts[2] ?? '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err(400, 'BAD_DATE', 'Invalid date.');
        if (!p.blackoutEditable) return err(403, 'BLACKOUT_LOCKED', 'Blackout editing is disabled for your profile.');
        if (date < todayIST()) return err(422, 'PAST_DATE', 'You can’t change past dates.');
        if (p.bookings.some((b) => b.event.date === date && b.availability === 'CONFIRMED')) {
          return err(409, 'HAS_BOOKING', 'You have a confirmed booking on this date.');
        }
        p.blackouts = p.blackouts.filter((x) => x.date !== date);
        if (method === 'PUT') p.blackouts.push({ date, reason: ((req.body as { reason?: string } | undefined)?.reason ?? null) as string });
        d.blackouts[p.talentSlug] = p.blackouts.map((x) => x.date);
        return ok(p.blackouts.slice().sort((a, b) => a.date.localeCompare(b.date)));
      }
    }

    return err(404, 'NOT_FOUND', `No mock route for ${method} /${parts.join('/')}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'issues' in e) {
      return err(422, 'VALIDATION_FAILED', 'Some details need another look.');
    }
    console.error('[mock-api]', e);
    return err(500, 'INTERNAL', 'Something went wrong on our side.');
  }
}

/** BigInt-safe JSON (paise travel as strings, like the real API). */
export const toWire = (body: unknown): unknown =>
  body === undefined ? undefined : (JSON.parse(JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) as unknown);
