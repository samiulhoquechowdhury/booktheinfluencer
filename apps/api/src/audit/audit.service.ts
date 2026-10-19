import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { PrismaService } from '../prisma/prisma.service';

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

/** Never store secrets in the audit trail. */
const SECRET_KEYS = new Set(['password', 'passwordHash', 'mfaSecret', 'token', 'tokenHash', 'code', 'accessToken', 'refreshToken', 'mfaToken']);
const scrub = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET_KEYS.has(k) ? '[redacted]' : scrub(x)]));
  if (typeof v === 'bigint') return v.toString();
  return v;
};

/** AUD-1..3: append-only record of who changed what. */
@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(e: AuditEntry, tx: Prisma.TransactionClient = this.prisma) {
    await tx.auditLog.create({
      data: {
        actorId: e.actorId ?? null,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        before: e.before === undefined ? undefined : (scrub(e.before) as Prisma.InputJsonValue),
        after: e.after === undefined ? undefined : (scrub(e.after) as Prisma.InputJsonValue),
        ip: e.ip ?? null,
      },
    });
  }
}
