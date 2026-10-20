import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { CustomerBookingSchema, CustomerQuoteSchema, QuoteDecision } from '@repo/schemas';
import type { z } from 'zod';
import { assertLeadTransition, calculateQuote } from '@repo/utils';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, NotFoundError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { PipelineService, toFacts } from '../pipeline/pipeline.service';
import { PrismaService } from '../prisma/prisma.service';
import { toBookingEvent } from './booking-event';
import { todayIST } from './quote-access';
import { toCalc, withAmounts } from './quotes.service';

const FACTS = {
  quotes: { select: { status: true } },
  contracts: { select: { status: true } },
  milestones: { select: { status: true, isAdvance: true } },
  payout: { select: { status: true } },
} satisfies Prisma.BookingInclude;

const BOOKING_INCLUDE = {
  lead: { include: { owner: { select: { name: true, phone: true } }, activities: { orderBy: { createdAt: 'asc' } } } },
  talent: { include: { media: { where: { isCover: true }, take: 1 }, categories: { where: { isPrimary: true }, take: 1, include: { category: { select: { slug: true } } } } } },
  quotes: { orderBy: { version: 'desc' }, include: { lineItems: { orderBy: { sortOrder: 'asc' } } } },
  contracts: { orderBy: { sentAt: 'desc' } },
  milestones: { orderBy: { dueDate: 'asc' } },
} satisfies Prisma.BookingInclude;
type BookingRow = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;
type QuoteRow = BookingRow['quotes'][number];
/** Wire shapes: money as decimal strings (BigInt can't be JSON-encoded). */
type CustomerBooking = z.input<typeof CustomerBookingSchema>;
type CustomerQuote = z.input<typeof CustomerQuoteSchema>;

const s = (p: bigint) => p.toString();
const day = (d: Date) => d.toISOString().slice(0, 10);
/** Versions the customer has been shown (never drafts or ones awaiting approval). */
const CUSTOMER_VISIBLE = new Set(['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED']);

/** Customer-safe timeline entries; internal notes, owners and availability chatter stay internal. */
function timelineLabel(a: BookingRow['lead']['activities'][number], bookingId: string): string | null {
  const meta = (a.meta ?? {}) as { bookingId?: string; version?: number };
  if (meta.bookingId && meta.bookingId !== bookingId) return null;
  switch (a.type) {
    case 'brief_received':
      return 'Brief received';
    case 'quote_sent':
      return meta.version ? `Quote v${meta.version} sent` : 'Quote sent';
    case 'quote_accepted':
      return 'Quote accepted';
    case 'quote_changes_requested':
      return 'Changes requested';
    case 'contract_sent':
      return 'Contract sent for signature';
    case 'contract_signed':
      return 'Contract signed';
    case 'payment_received':
      return a.body ?? 'Payment received';
    case 'confirmed':
      return 'Booking confirmed';
    default:
      return null;
  }
}

/**
 * Customer side of quotes and bookings (CUS-2, QUO-7, T-185/186). Every DTO matches the strict
 * schemas in @repo/schemas, so a stray internal field (cost, payout, margin) fails the tests.
 */
@Injectable()
export class CustomerBookingsService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(PipelineService) private readonly pipeline: PipelineService,
  ) {}

  toCustomerQuote(q: QuoteRow): CustomerQuote {
    const t = calculateQuote(q.lineItems.map(toCalc));
    const expired = q.status === 'SENT' && q.validUntil.getTime() < Date.now();
    return {
      id: q.id,
      version: q.version,
      status: expired ? 'EXPIRED' : q.status === 'REJECTED' ? 'CHANGES_REQUESTED' : (q.status as CustomerQuote['status']),
      issuedAt: (q.sentAt ?? q.createdAt).toISOString(),
      validUntil: q.validUntil.toISOString(),
      lineItems: q.lineItems.map((l) => ({ id: l.id, type: l.type, description: l.description, amountPaise: s(l.customerAmountPaise) })),
      subtotalPaise: s(t.subtotalPaise),
      gstBps: q.gstBps,
      taxPaise: s(t.taxPaise),
      totalPaise: s(t.totalPaise),
      milestones: withAmounts(q, t.totalPaise).map((m, i) => ({ id: `${q.id}-m${i + 1}`, label: m.label, percentBps: m.percentBps, amountPaise: s(m.amountPaise), dueDate: m.dueDate })),
      inclusions: q.inclusions,
      notes: q.notes,
      acceptedAt: q.acceptedAt?.toISOString() ?? null,
      changeRequest: q.changeRequest,
    };
  }

  private summary(b: BookingRow) {
    const l = b.lead;
    const cover = b.talent.media[0];
    return {
      ref: b.ref,
      stage: l.stage,
      availability: b.availability,
      talent: {
        slug: b.talent.slug,
        name: b.talent.stageName,
        primaryCategory: b.talent.categories[0]?.category.slug as CustomerBooking['talent']['primaryCategory'],
        image: cover
          ? { src: cover.key, alt: cover.alt, width: cover.width ?? 1200, height: cover.height ?? 1500, ...(cover.blurDataURL ? { blurDataURL: cover.blurDataURL } : {}), ...(cover.credit ? { credit: cover.credit } : {}) }
          : { src: '/talent/placeholder.jpg', alt: b.talent.stageName, width: 1200, height: 1500 },
      },
      event: toBookingEvent(l),
      createdAt: b.createdAt.toISOString(),
    };
  }

  toCustomerBooking(b: BookingRow): CustomerBooking {
    const contract = b.contracts.find((c) => c.status === 'SIGNED') ?? b.contracts.find((c) => c.status !== 'VOID');
    const today = todayIST();
    return {
      ...this.summary(b),
      leadRef: b.lead.ref,
      quotes: b.quotes.filter((q) => CUSTOMER_VISIBLE.has(q.status)).map((q) => this.toCustomerQuote(q)),
      contract: {
        status: !contract || contract.status === 'DRAFT' ? 'NOT_SENT' : contract.status === 'SIGNED' ? 'SIGNED' : 'SENT',
        sentAt: contract?.sentAt?.toISOString() ?? null,
        signedAt: contract?.signedAt?.toISOString() ?? null,
      },
      advancePaid: b.milestones.some((m) => m.isAdvance && m.status === 'PAID'),
      milestones: b.milestones
        .filter((m) => m.status !== 'CANCELLED' && m.status !== 'REFUNDED')
        .map((m) => ({
          id: m.id,
          label: m.label,
          amountPaise: s(m.amountPaise),
          dueDate: day(m.dueDate),
          status: m.status === 'PAID' ? 'PAID' : m.status === 'OVERDUE' ? 'OVERDUE' : m.status === 'LINK_SENT' || day(m.dueDate) <= today ? 'DUE' : 'UPCOMING',
          paidAt: m.paidAt?.toISOString() ?? null,
          receiptNo: m.receiptNo,
        })),
      documents: [], // uploads wait for the storage vendor
      activity: b.lead.activities.flatMap((a) => {
        const label = timelineLabel(a, b.id);
        return label ? [{ at: a.createdAt.toISOString(), label }] : [];
      }),
      notes: b.lead.notes,
      manager: this.manager(b.lead.owner),
    };
  }

  private manager(owner: { name: string | null; phone: string | null } | null) {
    const phone = owner?.phone ?? this.env.SUPPORT_PHONE ?? '';
    return { name: owner?.name ?? 'BookTheInfluencer desk', phone, whatsapp: phone.replace(/\D/g, '') ? phone.replace(/[^\d+]/g, '') : '' };
  }

  /** GET /me/bookings: bookings plus briefs that don't name a talent yet. */
  async dashboard(u: AuthUserRef) {
    const [bookings, briefs] = await Promise.all([
      this.prisma.booking.findMany({ where: { lead: { customerId: u.id } }, include: BOOKING_INCLUDE, orderBy: { createdAt: 'desc' } }),
      this.prisma.lead.findMany({ where: { customerId: u.id, bookings: { none: {} } }, include: BOOKING_INCLUDE.lead.include, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      bookings: bookings.map((b) => this.summary(b)),
      briefs: briefs.map((l) => ({ ref: l.ref, event: toBookingEvent(l), createdAt: l.createdAt.toISOString() })),
    };
  }

  async byRef(ref: string, u: AuthUserRef) {
    return this.toCustomerBooking(await this.load(this.prisma, ref, u));
  }

  /** QUO-7: accept (records IP, time, user) or request changes. Only the booking's own customer. */
  async decide(ref: string, quoteId: string, d: QuoteDecision, u: AuthUserRef, ip?: string) {
    const pre = await this.load(this.prisma, ref, u);
    const quote = pre.quotes.find((q) => q.id === quoteId);
    if (!quote || !CUSTOMER_VISIBLE.has(quote.status)) throw new NotFoundError('Quote', quoteId);
    if (quote.status !== 'SENT') throw new DomainError('QUOTE_NOT_OPEN', 'This quote is no longer open. Your latest quote is shown on the booking.', 409);
    if (quote.validUntil.getTime() < Date.now()) {
      await this.prisma.quote.update({ where: { id: quote.id }, data: { status: 'EXPIRED' } });
      throw new DomainError('QUOTE_EXPIRED', 'This quote has expired. Ask your booking manager for a fresh one.', 409);
    }

    await this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: two tabs must not both accept.
      const before = await this.leadFacts(tx, pre.leadId);
      const claimed = await tx.quote.updateMany({ where: { id: quote.id, status: 'SENT' }, data: d.action === 'accept' ? { status: 'ACCEPTED', acceptedAt: new Date(), acceptedByUserId: u.id, acceptedIp: ip ?? null } : { status: 'REJECTED', changeRequest: d.message } });
      if (claimed.count !== 1) throw new DomainError('QUOTE_NOT_OPEN', 'This quote is no longer open.', 409);
      const { lead } = before;

      if (d.action === 'accept') {
        const t = calculateQuote(quote.lineItems.map(toCalc));
        await tx.booking.update({ where: { id: pre.id }, data: { sellingTotalPaise: t.totalPaise, payoutTotalPaise: t.payoutTotalPaise, marginPaise: t.marginPaise } });
        await tx.paymentMilestone.createMany({
          data: withAmounts(quote, t.totalPaise).map((m, i) => ({ bookingId: pre.id, label: m.label, amountPaise: m.amountPaise, dueDate: new Date(`${m.dueDate}T00:00:00.000Z`), isAdvance: i === 0 })),
        });
        await tx.activity.create({ data: { leadId: lead.id, actorId: u.id, type: 'quote_accepted', body: `Quote v${quote.version} accepted`, meta: { bookingId: pre.id, quoteId: quote.id } } });
        if (lead.stage === 'QUOTE_SENT' || lead.stage === 'NEGOTIATION') {
          assertLeadTransition(lead.stage, 'ADVANCE_PENDING', (await this.leadFacts(tx, lead.id)).ctx);
          await tx.lead.update({ where: { id: lead.id }, data: { stage: 'ADVANCE_PENDING' } });
          await tx.activity.create({ data: { leadId: lead.id, actorId: u.id, type: 'stage_change', body: 'Customer accepted the quote', meta: { from: lead.stage, to: 'ADVANCE_PENDING' } } });
        }
        await this.audit.record({ actorId: u.id, action: 'quote.accept', entity: 'quote', entityId: quote.id, after: { bookingId: pre.id, totalPaise: s(t.totalPaise) }, ip }, tx);
      } else {
        await tx.activity.create({ data: { leadId: lead.id, actorId: u.id, type: 'quote_changes_requested', body: d.message, meta: { bookingId: pre.id, quoteId: quote.id } } });
        if (lead.stage === 'QUOTE_SENT') {
          // Negotiating needs a SENT quote, so check against the facts from before this decision.
          assertLeadTransition('QUOTE_SENT', 'NEGOTIATION', before.ctx);
          await tx.lead.update({ where: { id: lead.id }, data: { stage: 'NEGOTIATION' } });
          await tx.activity.create({ data: { leadId: lead.id, actorId: u.id, type: 'stage_change', body: 'Customer asked for changes', meta: { from: 'QUOTE_SENT', to: 'NEGOTIATION' } } });
        }
        await this.audit.record({ actorId: u.id, action: 'quote.request_changes', entity: 'quote', entityId: quote.id, ip }, tx);
      }
    });

    // Quote accepted is one of the four confirmation conditions (OPS-1).
    if (d.action === 'accept') await this.pipeline.evaluateConfirmation(pre.id);
    return this.byRef(ref, u);
  }

  private async leadFacts(tx: Prisma.TransactionClient, leadId: string) {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, include: { bookings: { include: FACTS } } });
    return { lead, ctx: { actor: 'user' as const, ownerId: lead.ownerId, bookings: lead.bookings.map(toFacts) } };
  }

  /** The booking by ref, only if it belongs to this customer (404 otherwise, never 403: don't confirm it exists). */
  private async load(db: Prisma.TransactionClient | PrismaService, ref: string, u: AuthUserRef) {
    const b = await db.booking.findFirst({ where: { ref, lead: { customerId: u.id } }, include: BOOKING_INCLUDE });
    if (!b) throw new NotFoundError('Booking', ref);
    return b;
  }
}
