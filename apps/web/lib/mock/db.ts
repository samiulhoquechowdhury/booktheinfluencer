import 'server-only';
import talentsJson from './data/talents.json';
import bookingsJson from './data/bookings.json';
import portalJson from './data/portal.json';
import blackoutsJson from './data/blackouts.json';

/**
 * In-memory mock database. Raw records mirror what the real DB holds, INCLUDING internal fields
 * (cost, payout, margin) — serializers.ts is the only way data leaves. State lives on globalThis
 * so it survives dev HMR; it resets on server restart.
 */
export type RawTalent = (typeof talentsJson)[number];
export type RawBooking = (typeof bookingsJson)[number] & { quotes: RawQuote[] };
export type RawQuote = {
  id: string;
  version: number;
  status: string;
  issuedAt: string;
  validUntil: string;
  lineItems: { id: string; type: string; description: string; amountPaise: string; internalCostPaise: string; payoutPaise: string | null }[];
  subtotalPaise: string;
  gstBps: number;
  taxPaise: string;
  totalPaise: string;
  milestones: { id: string; label: string; percentBps: number; amountPaise: string; dueDate: string }[];
  inclusions: string[];
  notes: string | null;
  acceptedAt: string | null;
  changeRequest: string | null;
  marginPaise: string;
  approvedBy: string;
};
export type RawPortal = typeof portalJson;
export type RawBrief = { ref: string; event: RawBooking['event']; createdAt: string; contact: Record<string, unknown> };

type Db = {
  talents: RawTalent[];
  bookings: RawBooking[];
  briefs: RawBrief[];
  portal: RawPortal;
  blackouts: Record<string, string[]>;
  favourites: Set<string>;
  seq: number;
};

const g = globalThis as unknown as { __mockDb?: Db };

export function db(): Db {
  if (!g.__mockDb) {
    g.__mockDb = {
      talents: structuredClone(talentsJson),
      bookings: structuredClone(bookingsJson) as unknown as RawBooking[],
      briefs: [],
      portal: structuredClone(portalJson),
      blackouts: structuredClone(blackoutsJson) as Record<string, string[]>,
      favourites: new Set(['aanya-barua', 'dj-nyx', 'kavita-menon']),
      seq: 24030,
    };
  }
  return g.__mockDb;
}
