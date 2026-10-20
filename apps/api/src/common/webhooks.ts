import type { Prisma } from '@repo/db';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Idempotent webhook intake (PAY-3, trd §8): the raw event is stored once under
 * `<provider>:<eventId>`; `process` runs inside a transaction that also marks it processed, so a
 * replay or a duplicate delivery is a no-op, and a delivery that failed midway is retried cleanly.
 */
export async function ingestOnce<T>(prisma: PrismaService, provider: string, eventId: string, payload: unknown, process: (tx: Prisma.TransactionClient) => Promise<T>) {
  const id = `${provider}:${eventId}`;
  await prisma.webhookEvent.createMany({ data: [{ id, provider, payload: payload as Prisma.InputJsonValue }], skipDuplicates: true });
  return prisma.$transaction(async (tx) => {
    // Claim it: only one delivery can flip processedAt from null.
    const claimed = await tx.webhookEvent.updateMany({ where: { id, processedAt: null }, data: { processedAt: new Date() } });
    if (claimed.count !== 1) return { duplicate: true as const };
    return { duplicate: false as const, result: await process(tx) };
  });
}
