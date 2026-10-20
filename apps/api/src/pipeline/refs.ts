import type { Prisma } from '@repo/db';

type Tx = Pick<Prisma.TransactionClient, '$queryRaw'>;

/** Customer-facing references from Postgres sequences: TB-2026-001000, BK-2026-001000, RC-2026-001000. */
const QUERIES = {
  lead_ref_seq: (tx: Tx) => tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('lead_ref_seq') AS n`,
  booking_ref_seq: (tx: Tx) => tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('booking_ref_seq') AS n`,
  receipt_seq: (tx: Tx) => tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('receipt_seq') AS n`,
  contact_seq: (tx: Tx) => tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('contact_seq') AS n`,
};

async function next(tx: Tx, seq: keyof typeof QUERIES, prefix: string) {
  const [row] = await QUERIES[seq](tx);
  return `${prefix}-${new Date().getUTCFullYear()}-${String(row!.n).padStart(6, '0')}`;
}

export const nextLeadRef = (tx: Tx) => next(tx, 'lead_ref_seq', 'TB');
export const nextBookingRef = (tx: Tx) => next(tx, 'booking_ref_seq', 'BK');
export const nextReceiptNo = (tx: Tx) => next(tx, 'receipt_seq', 'RC');
export const nextContactRef = (tx: Tx) => next(tx, 'contact_seq', 'CT');
