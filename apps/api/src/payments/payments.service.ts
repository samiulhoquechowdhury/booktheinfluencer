import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { ManualPayment, MilestoneQuery } from '@repo/schemas';
import { formatINR } from '@repo/utils';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, NotFoundError } from '../common/errors';
import { ingestOnce } from '../common/webhooks';
import { PipelineService } from '../pipeline/pipeline.service';
import { nextReceiptNo } from '../pipeline/refs';
import { PrismaService } from '../prisma/prisma.service';
import { todayIST } from '../quotes/quote-access';
import { PAYMENT_GATEWAY, type GatewayEvent, type PaymentGateway } from './gateway';

type Tx = Prisma.TransactionClient;
type Headers = Record<string, string | string[] | undefined>;
const LINK_TTL_MS = 7 * 86_400_000;

/**
 * Payments (PAY-1..5, T-204..208). A milestone becomes PAID only from a verified gateway webhook or
 * an Accounts entry — never from the browser (rules.md §0.4). Each newly paid milestone runs the
 * confirmation check.
 */
@Injectable()
export class PaymentsService {
  private readonly log = new Logger('Payments');

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(PipelineService) private readonly pipeline: PipelineService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /** POST /me/bookings/:ref/milestones/:id/pay → a hosted link. The payment itself arrives by webhook. */
  async payIntent(ref: string, milestoneId: string, u: AuthUserRef) {
    const m = await this.prisma.paymentMilestone.findFirst({
      where: { id: milestoneId, booking: { ref, lead: { customerId: u.id } } },
      include: { booking: { include: { milestones: true, lead: { include: { customer: { select: { name: true, phone: true, email: true } } } }, talent: { select: { stageName: true } } } } },
    });
    if (!m) throw new NotFoundError('Milestone', milestoneId);
    if (m.status === 'PAID') throw new DomainError('ALREADY_PAID', 'This payment is already done.', 409);
    if (m.status === 'CANCELLED' || m.status === 'REFUNDED') throw new DomainError('MILESTONE_CLOSED', 'This payment is no longer due.', 409);
    const advance = m.booking.milestones.find((x) => x.isAdvance);
    if (!m.isAdvance && advance && advance.status !== 'PAID') throw new DomainError('ADVANCE_FIRST', 'Please pay the advance first.', 409);

    let url = m.gatewayLinkUrl;
    if (!m.gatewayLinkId || !url) {
      const link = await this.gateway.createLink({
        referenceId: m.id,
        amountPaise: m.amountPaise,
        description: `${m.label} · ${m.booking.talent.stageName} · ${m.booking.ref}`,
        customer: m.booking.lead.customer,
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
      });
      // Only one link per milestone, even if the customer clicks twice at once.
      const set = await this.prisma.paymentMilestone.updateMany({ where: { id: m.id, gatewayLinkId: null }, data: { gatewayLinkId: link.linkId, gatewayLinkUrl: link.url, status: 'LINK_SENT' } });
      url = set.count === 1 ? link.url : (await this.prisma.paymentMilestone.findUniqueOrThrow({ where: { id: m.id } })).gatewayLinkUrl;
    }
    return { milestoneId: m.id, amountPaise: m.amountPaise.toString(), checkoutUrl: url, message: `Pay ${formatINR(m.amountPaise)} securely. We confirm as soon as the payment clears.` };
  }

  /** POST /webhooks/payments (PAY-3): signature first, then idempotent processing. */
  async webhook(rawBody: Buffer | undefined, headers: Headers, body: unknown) {
    if (!this.gateway.verifyWebhook(rawBody, headers)) throw new DomainError('BAD_SIGNATURE', 'Invalid webhook signature.', 401);
    const event = this.gateway.parseWebhook(body, headers);
    if (!event) return { ignored: true };
    const out = await ingestOnce(this.prisma, `payment:${this.gateway.name}`, event.eventId, body, (tx) => this.applyGatewayEvent(tx, event));
    if (!out.duplicate && out.result.bookingId && out.result.paid) await this.pipeline.evaluateConfirmation(out.result.bookingId);
    return out.duplicate ? { duplicate: true } : { processed: true };
  }

  private async applyGatewayEvent(tx: Tx, e: GatewayEvent) {
    const m = await tx.paymentMilestone.findFirst({ where: e.linkId ? { gatewayLinkId: e.linkId } : { id: e.referenceId ?? '-' }, include: { booking: true } });
    if (!m) {
      this.log.warn(`Webhook ${e.eventId} for an unknown link`);
      return { bookingId: null, paid: false };
    }
    if (e.type === 'failed') {
      await tx.activity.create({ data: { leadId: m.booking.leadId, type: 'payment_failed', body: `${m.label} payment failed`, meta: { bookingId: m.bookingId, milestoneId: m.id } } });
      return { bookingId: m.bookingId, paid: false };
    }
    if (await tx.payment.findUnique({ where: { gatewayPaymentId: e.paymentId } })) return { bookingId: m.bookingId, paid: false };
    return this.applyPayment(tx, m, { method: e.method, amountPaise: e.amountPaise, gatewayPaymentId: e.paymentId, receivedAt: new Date() }, null);
  }

  /** PAY-4: Accounts records a bank transfer / UPI / cheque, with its reference (and proof once uploads exist). */
  async recordManual(milestoneId: string, input: ManualPayment, u: AuthUserRef, ip?: string) {
    if (input.receivedOn > todayIST()) throw new DomainError('FUTURE_DATE', 'The received date can’t be in the future.', 400);
    const out = await this.prisma.$transaction(async (tx) => {
      const m = await tx.paymentMilestone.findUnique({ where: { id: milestoneId }, include: { booking: true } });
      if (!m) throw new NotFoundError('Milestone', milestoneId);
      if (m.status === 'CANCELLED' || m.status === 'REFUNDED') throw new DomainError('MILESTONE_CLOSED', 'This milestone is closed.', 409);
      const r = await this.applyPayment(tx, m, { method: input.method, amountPaise: BigInt(input.amountPaise), reference: input.reference, note: input.note ?? null, proofDocumentId: input.proofDocumentId ?? null, receivedAt: new Date(`${input.receivedOn}T12:00:00+05:30`) }, u.id);
      await this.audit.record({ actorId: u.id, action: 'payment.manual', entity: 'milestone', entityId: m.id, after: { amountPaise: input.amountPaise, method: input.method, reference: input.reference }, ip }, tx);
      return r;
    });
    if (out.paid) await this.pipeline.evaluateConfirmation(out.bookingId);
    return this.forBooking(out.bookingId);
  }

  /** Records the payment; the milestone is PAID once payments cover its amount. */
  private async applyPayment(
    tx: Tx,
    m: Prisma.PaymentMilestoneGetPayload<{ include: { booking: true } }>,
    p: { method: string; amountPaise: bigint; receivedAt: Date; gatewayPaymentId?: string; reference?: string; note?: string | null; proofDocumentId?: string | null },
    recordedById: string | null,
  ) {
    await tx.payment.create({ data: { milestoneId: m.id, status: 'captured', recordedById, ...p } });
    const leadId = m.booking.leadId;
    const meta = { bookingId: m.bookingId, milestoneId: m.id };
    if (m.status === 'PAID') {
      // Paid twice (e.g. link and bank transfer): keep the record and flag it for a refund.
      await tx.activity.create({ data: { leadId, type: 'payment_duplicate', body: `Extra payment of ${formatINR(p.amountPaise)} on ${m.label}; refund needed`, meta } });
      return { bookingId: m.bookingId, paid: false };
    }
    const received = (await tx.payment.aggregate({ where: { milestoneId: m.id, status: 'captured' }, _sum: { amountPaise: true } }))._sum.amountPaise ?? 0n;
    if (received < m.amountPaise) {
      await tx.activity.create({ data: { leadId, type: 'payment_partial', body: `${formatINR(p.amountPaise)} received on ${m.label}; ${formatINR(m.amountPaise - received)} still due`, meta } });
      return { bookingId: m.bookingId, paid: false };
    }
    const receiptNo = await nextReceiptNo(tx);
    await tx.paymentMilestone.update({ where: { id: m.id }, data: { status: 'PAID', paidAt: p.receivedAt, receiptNo } });
    await tx.activity.create({ data: { leadId, actorId: recordedById, type: 'payment_received', body: `${m.label} paid`, meta: { ...meta, receiptNo } } });
    if (!recordedById) await this.audit.record({ actorId: null, action: 'payment.gateway', entity: 'milestone', entityId: m.id, after: { amountPaise: p.amountPaise.toString(), receiptNo } }, tx);
    // Receipt email (PAY-5) goes through the notifications worker once it exists.
    return { bookingId: m.bookingId, paid: true };
  }

  /** Collections across bookings (design.md /payments). Overdue = unpaid and past its due date (no job marks it yet). */
  async listMilestones(q: MilestoneQuery) {
    const today = new Date(`${todayIST()}T00:00:00.000Z`);
    const unpaid: Prisma.PaymentMilestoneWhereInput = { status: { in: ['PENDING', 'LINK_SENT', 'OVERDUE'] }, booking: { cancelledAt: null } };
    const where: Prisma.PaymentMilestoneWhereInput = {
      AND: [
        q.view === 'paid' ? { status: 'PAID' } : q.view === 'all' ? {} : q.view === 'overdue' ? { ...unpaid, dueDate: { lt: today } } : unpaid,
        q.bookingId ? { bookingId: q.bookingId } : {},
        q.q
          ? { OR: [{ booking: { ref: { contains: q.q, mode: 'insensitive' } } }, { booking: { lead: { ref: { contains: q.q, mode: 'insensitive' } } } }, { booking: { lead: { companyName: { contains: q.q, mode: 'insensitive' } } } }, { booking: { lead: { customer: { name: { contains: q.q, mode: 'insensitive' } } } } }, { receiptNo: { contains: q.q, mode: 'insensitive' } }] }
          : {},
      ],
    };
    const [rows, total, overdue] = await this.prisma.$transaction([
      this.prisma.paymentMilestone.findMany({
        where,
        include: { booking: { include: { talent: { select: { stageName: true } }, lead: { select: { id: true, ref: true, companyName: true, customer: { select: { name: true } } } } } } },
        orderBy: q.view === 'paid' ? { paidAt: 'desc' } : { dueDate: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.paymentMilestone.count({ where }),
      this.prisma.paymentMilestone.aggregate({ where: { ...unpaid, dueDate: { lt: today } }, _sum: { amountPaise: true }, _count: true }),
    ]);
    return {
      data: rows.map((m) => ({
        id: m.id,
        label: m.label,
        isAdvance: m.isAdvance,
        amountPaise: m.amountPaise.toString(),
        dueDate: m.dueDate.toISOString().slice(0, 10),
        status: m.status,
        overdue: m.status !== 'PAID' && m.status !== 'CANCELLED' && m.status !== 'REFUNDED' && m.dueDate < today,
        paidAt: m.paidAt?.toISOString() ?? null,
        receiptNo: m.receiptNo,
        linkSent: Boolean(m.gatewayLinkId),
        booking: { id: m.bookingId, ref: m.booking.ref, talent: m.booking.talent.stageName },
        lead: { id: m.booking.lead.id, ref: m.booking.lead.ref, customer: m.booking.lead.companyName ?? m.booking.lead.customer.name },
      })),
      meta: { page: q.page, pageSize: q.pageSize, total, overdue: { count: overdue._count, amountPaise: (overdue._sum.amountPaise ?? 0n).toString() } },
    };
  }

  /** Staff view: every milestone with its payments. Customer amounts only; no payout or margin. */
  async forBooking(bookingId: string) {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { milestones: { orderBy: { dueDate: 'asc' }, include: { payments: { orderBy: { receivedAt: 'asc' } } } } } });
    if (!b) throw new NotFoundError('Booking', bookingId);
    return {
      bookingId: b.id,
      ref: b.ref,
      milestones: b.milestones.map((m) => ({
        id: m.id,
        label: m.label,
        isAdvance: m.isAdvance,
        amountPaise: m.amountPaise.toString(),
        dueDate: m.dueDate.toISOString().slice(0, 10),
        status: m.status,
        paidAt: m.paidAt?.toISOString() ?? null,
        receiptNo: m.receiptNo,
        linkSent: Boolean(m.gatewayLinkId),
        payments: m.payments.map((p) => ({ id: p.id, method: p.method, amountPaise: p.amountPaise.toString(), status: p.status, reference: p.reference, gateway: Boolean(p.gatewayPaymentId), manual: Boolean(p.recordedById), receivedAt: p.receivedAt.toISOString() })),
      })),
    };
  }
}
