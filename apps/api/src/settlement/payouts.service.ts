import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, NotFoundError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { todayIST } from '../quotes/quote-access';

const INCLUDE = { booking: { include: { lead: { select: { id: true, ref: true, eventDate: true } }, talent: { select: { slug: true, stageName: true } } } } } satisfies Prisma.PayoutInclude;
type Row = Prisma.PayoutGetPayload<{ include: typeof INCLUDE }>;

const view = (p: Row) => ({
  id: p.id,
  bookingId: p.bookingId,
  bookingRef: p.booking.ref,
  leadRef: p.booking.lead.ref,
  talent: { slug: p.booking.talent.slug, name: p.booking.talent.stageName },
  eventDate: p.booking.lead.eventDate.toISOString().slice(0, 10),
  amountPaise: p.amountPaise.toString(),
  contractedPaise: p.booking.payoutTotalPaise?.toString() ?? null,
  status: p.status,
  scheduledFor: p.scheduledFor?.toISOString().slice(0, 10) ?? null,
  paidAt: p.paidAt?.toISOString() ?? null,
  reference: p.reference,
  note: p.note,
});

/**
 * Talent payouts (SET-1..3, T-242/243). Created at event completion for the contracted payout;
 * Accounts schedules, adjusts (with a reason) and records the bank transfer. Paying it stores the
 * booking's final margin.
 */
@Injectable()
export class PayoutsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(q: { page: number; pageSize: number; status?: Row['status'] }) {
    const where = { status: q.status };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payout.findMany({ where, include: INCLUDE, orderBy: [{ scheduledFor: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.payout.count({ where }),
    ]);
    return { data: rows.map(view), meta: { page: q.page, pageSize: q.pageSize, total } };
  }

  private async open(tx: Prisma.TransactionClient, id: string) {
    const p = await tx.payout.findUnique({ where: { id }, include: INCLUDE });
    if (!p) throw new NotFoundError('Payout', id);
    if (p.status === 'PAID') throw new DomainError('PAYOUT_PAID', 'This payout is already paid.', 409);
    if (p.status === 'ON_HOLD') throw new DomainError('PAYOUT_ON_HOLD', 'This payout is on hold (the booking was cancelled).', 409);
    return p;
  }

  async schedule(id: string, scheduledFor: string, u: AuthUserRef, ip?: string) {
    if (scheduledFor < todayIST()) throw new DomainError('PAST_DATE', 'Schedule it for today or later.', 400);
    return this.prisma.$transaction(async (tx) => {
      const p = await this.open(tx, id);
      const next = await tx.payout.update({ where: { id }, data: { status: 'SCHEDULED', scheduledFor: new Date(`${scheduledFor}T00:00:00.000Z`) }, include: INCLUDE });
      await this.audit.record({ actorId: u.id, action: 'payout.schedule', entity: 'payout', entityId: id, before: { status: p.status }, after: { scheduledFor }, ip }, tx);
      return view(next);
    });
  }

  /** e.g. a deduction agreed with the rep. The reason is kept on the payout and in the audit log. */
  async adjust(id: string, amountPaise: bigint, note: string, u: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const p = await this.open(tx, id);
      const next = await tx.payout.update({ where: { id }, data: { amountPaise, note }, include: INCLUDE });
      await this.audit.record({ actorId: u.id, action: 'payout.adjust', entity: 'payout', entityId: id, before: { amountPaise: p.amountPaise.toString() }, after: { amountPaise: amountPaise.toString(), note }, ip }, tx);
      return view(next);
    });
  }

  /** SET-2/3: record the transfer and store the booking's final margin. */
  async markPaid(id: string, reference: string, paidOn: string, u: AuthUserRef, ip?: string) {
    if (paidOn > todayIST()) throw new DomainError('FUTURE_DATE', 'The paid date can’t be in the future.', 400);
    return this.prisma.$transaction(async (tx) => {
      const p = await this.open(tx, id);
      const quote = await tx.quote.findFirst({ where: { bookingId: p.bookingId, status: 'ACCEPTED' } });
      const marginPaise = quote ? quote.subtotalPaise - p.amountPaise - quote.internalCostPaise : null;
      const next = await tx.payout.update({ where: { id }, data: { status: 'PAID', reference, paidAt: new Date(`${paidOn}T12:00:00+05:30`), paidById: u.id }, include: INCLUDE });
      if (marginPaise != null) await tx.booking.update({ where: { id: p.bookingId }, data: { marginPaise } });
      await tx.activity.create({ data: { leadId: p.booking.lead.id, actorId: u.id, type: 'payout_paid', body: `Payout to ${p.booking.talent.stageName} paid`, meta: { bookingId: p.bookingId, payoutId: id } } });
      await this.audit.record({ actorId: u.id, action: 'payout.paid', entity: 'payout', entityId: id, after: { reference, paidOn, amountPaise: p.amountPaise.toString(), marginPaise: marginPaise?.toString() ?? null }, ip }, tx);
      return view(next);
    });
  }
}
