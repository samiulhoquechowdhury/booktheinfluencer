import type { Prisma } from '@repo/db';

type Tx = Pick<Prisma.TransactionClient, '$queryRaw'>;

/** Customer-facing references from Postgres sequences: TB-2026-001000, BK-2026-001000. */
async function next(tx: Tx, seq: 'lead_ref_seq' | 'booking_ref_seq', prefix: string) {
  const [row] = seq === 'lead_ref_seq' ? await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('lead_ref_seq') AS n` : await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('booking_ref_seq') AS n`;
  return `${prefix}-${new Date().getUTCFullYear()}-${String(row!.n).padStart(6, '0')}`;
}

export const nextLeadRef = (tx: Tx) => next(tx, 'lead_ref_seq', 'TB');
export const nextBookingRef = (tx: Tx) => next(tx, 'booking_ref_seq', 'BK');
