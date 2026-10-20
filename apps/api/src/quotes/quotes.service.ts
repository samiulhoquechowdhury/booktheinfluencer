import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { QuoteInput } from '@repo/schemas';
import { approvalReasons, calculateQuote, canTransitionLead, milestoneAmounts, rupeesToPaise, TERMINAL_STAGES, type MilestonePlanItem } from '@repo/utils';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, ForbiddenError, NotFoundError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { toFacts } from '../pipeline/pipeline.service';
import { PrismaService } from '../prisma/prisma.service';
import { endOfDayIST, seesFinance, seesPayout, todayIST } from './quote-access';

type Tx = Prisma.TransactionClient;
const QUOTE_INCLUDE = { lineItems: { orderBy: { sortOrder: 'asc' } } } satisfies Prisma.QuoteInclude;
type QuoteRow = Prisma.QuoteGetPayload<{ include: typeof QUOTE_INCLUDE }>;
type LineRow = QuoteRow['lineItems'][number];

const FACTS = {
  quotes: { select: { status: true } },
  contracts: { select: { status: true } },
  milestones: { select: { status: true, isAdvance: true } },
  payout: { select: { status: true } },
} satisfies Prisma.BookingInclude;

const s = (p: bigint) => p.toString();
const rupees = (p: bigint) => Number(p / 100n);
/** Stages after which a booking's price is settled. */
const PRICE_LOCKED = new Set(['ADVANCE_PENDING', 'CONFIRMED', 'EVENT_COMPLETED', 'SETTLEMENT', ...TERMINAL_STAGES]);

/**
 * Staff quote builder (QUO-1..6, T-180..182). Versions are immutable once sent; a revision is a new
 * version. Payout and internal cost are only readable/writable by the roles trd §7 allows.
 */
@Injectable()
export class QuotesService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Role-aware staff view of one version. */
  view(q: QuoteRow, u: AuthUserRef) {
    const payout = seesPayout(u);
    const finance = seesFinance(u);
    const t = calculateQuote(q.lineItems.map(toCalc));
    return {
      id: q.id,
      bookingId: q.bookingId,
      version: q.version,
      status: q.status,
      validUntil: q.validUntil.toISOString(),
      sentAt: q.sentAt?.toISOString() ?? null,
      acceptedAt: q.acceptedAt?.toISOString() ?? null,
      changeRequest: q.changeRequest,
      notes: q.notes,
      inclusions: q.inclusions,
      gstBps: q.gstBps,
      approval: { reasons: q.approvalReasons, approved: Boolean(q.approvedById) },
      lines: q.lineItems.map((l, i) => ({
        id: l.id,
        type: l.type,
        description: l.description,
        amountPaise: s(l.customerAmountPaise),
        taxPaise: s(t.lineTaxPaise[i]!),
        ...(payout ? { payoutPaise: l.payoutPaise == null ? null : s(l.payoutPaise) } : {}),
        ...(finance ? { internalCostPaise: s(l.internalCostPaise) } : {}),
      })),
      milestones: withAmounts(q, t.totalPaise).map((m) => ({ ...m, amountPaise: s(m.amountPaise) })),
      subtotalPaise: s(t.subtotalPaise),
      taxPaise: s(t.taxPaise),
      totalPaise: s(t.totalPaise),
      ...(payout ? { payoutTotalPaise: s(t.payoutTotalPaise), payoutComplete: payoutComplete(q.lineItems) } : {}),
      ...(finance ? { internalCostPaise: s(t.internalCostPaise), marginPaise: s(t.marginPaise), marginBps: t.marginBps } : {}),
    };
  }

  /** Versions for a booking, plus rate-card hints for the builder (staff may see rate cards). */
  async forBooking(bookingId: string, u: AuthUserRef) {
    const b = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { lead: { select: { id: true, ref: true, stage: true, eventType: true } }, talent: { select: { slug: true, stageName: true } }, quotes: { orderBy: { version: 'desc' }, include: QUOTE_INCLUDE } },
    });
    if (!b) throw new NotFoundError('Booking', bookingId);
    const rc = await this.rateCard(this.prisma, b.talentId, b.lead.eventType);
    return {
      booking: { id: b.id, ref: b.ref, availability: b.availability, lead: b.lead, talent: { slug: b.talent.slug, name: b.talent.stageName } },
      rateCard: rc ? { eventType: rc.eventType, minimumRupees: rupees(rc.minimumRatePaise), sellingRupees: rupees(rc.sellingRatePaise), commissionBps: rc.commissionBps } : null,
      marginFloorBps: seesFinance(u) ? this.env.QUOTE_MARGIN_FLOOR_BPS : undefined,
      quotes: b.quotes.map((q) => this.view(q, u)),
    };
  }

  async get(quoteId: string, u: AuthUserRef) {
    return this.view(await this.load(this.prisma, quoteId), u);
  }

  /** New version (T-180). Lines sent with an `id` from the latest version keep their hidden values. */
  async create(bookingId: string, input: QuoteInput, u: AuthUserRef, ip?: string) {
    const id = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id: bookingId }, include: { lead: true, quotes: { orderBy: { version: 'desc' }, include: QUOTE_INCLUDE } } });
      if (!b) throw new NotFoundError('Booking', bookingId);
      if (PRICE_LOCKED.has(b.lead.stage)) throw new DomainError('PRICE_LOCKED', 'This lead is past quoting.', 409);
      if (b.cancelledAt || b.availability === 'UNAVAILABLE' || b.availability === 'CONFIRMED') throw new DomainError('BOOKING_NOT_QUOTABLE', 'Quote only talent that is available or still being checked.', 409);
      if (b.quotes.some((q) => q.status === 'ACCEPTED')) throw new DomainError('QUOTE_ALREADY_ACCEPTED', 'The customer has already accepted a quote for this talent.', 409);
      this.assertFutureValidity(input.validUntil);

      const previous = b.quotes[0]?.lineItems ?? [];
      const lines = this.reconcile(input, previous, u).map(({ prevId: _, ...l }) => l);
      const version = (b.quotes[0]?.version ?? 0) + 1;
      // An unsent older draft is replaced by the new version; a SENT one stays live until this one is sent.
      await tx.quote.updateMany({ where: { bookingId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } }, data: { status: 'SUPERSEDED' } });
      const q = await tx.quote.create({ data: { bookingId, version, ...(await this.content(tx, b.talentId, b.lead.eventType, input, lines)) } });
      await tx.activity.create({ data: { leadId: b.leadId, actorId: u.id, type: 'quote_drafted', body: `Quote v${version} drafted`, meta: { bookingId, quoteId: q.id } } });
      await this.audit.record({ actorId: u.id, action: 'quote.create', entity: 'quote', entityId: q.id, after: { bookingId, version }, ip }, tx);
      return q.id;
    });
    return this.get(id, u);
  }

  /** Edit a version that hasn't been sent. Any edit clears a previous approval. */
  async update(quoteId: string, input: QuoteInput, u: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const q = await this.load(tx, quoteId);
      if (q.status !== 'DRAFT' && q.status !== 'PENDING_APPROVAL') throw new DomainError('QUOTE_NOT_EDITABLE', 'Sent quotes can’t be edited; create a new version.', 409);
      this.assertFutureValidity(input.validUntil);
      const b = await tx.booking.findUniqueOrThrow({ where: { id: q.bookingId }, include: { lead: { select: { eventType: true } } } });
      // Same version: keep line ids so the builder can keep editing with the ids it holds.
      const lines = this.reconcile(input, q.lineItems, u).map(({ prevId, ...l }) => ({ ...l, id: prevId }));
      await tx.quoteLineItem.deleteMany({ where: { quoteId } });
      await tx.quote.update({ where: { id: quoteId }, data: { ...(await this.content(tx, b.talentId, b.lead.eventType, input, lines)), status: 'DRAFT', approvedById: null } });
      await this.audit.record({ actorId: u.id, action: 'quote.update', entity: 'quote', entityId: quoteId, before: { status: q.status }, ip }, tx);
    });
    return this.get(quoteId, u);
  }

  /** T-182/T-184: send, or route to SUPER_ADMIN approval when QUO-6 applies. */
  async send(quoteId: string, u: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const q = await this.load(tx, quoteId);
      if (q.status !== 'DRAFT') throw new DomainError('QUOTE_NOT_SENDABLE', q.status === 'PENDING_APPROVAL' ? 'This quote is waiting for approval.' : 'Only a draft can be sent.', 409);
      const reasons = await this.refreshReasons(tx, q);
      if (reasons.length && !q.approvedById) {
        await tx.quote.update({ where: { id: quoteId }, data: { status: 'PENDING_APPROVAL' } });
        const b = await tx.booking.findUniqueOrThrow({ where: { id: q.bookingId } });
        await tx.activity.create({ data: { leadId: b.leadId, actorId: u.id, type: 'quote_approval_requested', body: `Quote v${q.version} needs approval`, meta: { quoteId, reasons } } });
        await this.audit.record({ actorId: u.id, action: 'quote.approval_requested', entity: 'quote', entityId: quoteId, after: { reasons }, ip }, tx);
        return;
      }
      await this.doSend(tx, q, u, ip);
    });
    return this.get(quoteId, u);
  }

  /** SUPER_ADMIN approves a quote that needs it; approval sends it straight away. */
  async approve(quoteId: string, note: string | undefined, u: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const q = await this.load(tx, quoteId);
      if (q.status !== 'PENDING_APPROVAL') throw new DomainError('QUOTE_NOT_PENDING', 'This quote isn’t waiting for approval.', 409);
      await tx.quote.update({ where: { id: quoteId }, data: { approvedById: u.id } });
      await this.audit.record({ actorId: u.id, action: 'quote.approve', entity: 'quote', entityId: quoteId, after: { reasons: q.approvalReasons, note }, ip }, tx);
      await this.doSend(tx, { ...q, approvedById: u.id }, u, ip, note);
    });
    return this.get(quoteId, u);
  }

  /** SUPER_ADMIN sends it back to the builder. */
  async returnToDraft(quoteId: string, note: string | undefined, u: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const q = await this.load(tx, quoteId);
      if (q.status !== 'PENDING_APPROVAL') throw new DomainError('QUOTE_NOT_PENDING', 'This quote isn’t waiting for approval.', 409);
      await tx.quote.update({ where: { id: quoteId }, data: { status: 'DRAFT' } });
      const b = await tx.booking.findUniqueOrThrow({ where: { id: q.bookingId } });
      await tx.activity.create({ data: { leadId: b.leadId, actorId: u.id, type: 'quote_returned', body: note ?? `Quote v${q.version} returned for changes`, meta: { quoteId } } });
      await this.audit.record({ actorId: u.id, action: 'quote.return', entity: 'quote', entityId: quoteId, after: { note }, ip }, tx);
    });
    return this.get(quoteId, u);
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private async doSend(tx: Tx, q: QuoteRow, u: AuthUserRef, ip?: string, note?: string) {
    if (q.validUntil.getTime() < Date.now()) throw new DomainError('QUOTE_VALIDITY_PAST', 'The validity date has passed; edit it before sending.', 409);
    if (!payoutComplete(q.lineItems)) throw new DomainError('PAYOUT_MISSING', 'A talent manager must enter the talent payout before this quote is sent.', 409);
    await tx.quote.updateMany({ where: { bookingId: q.bookingId, status: 'SENT', id: { not: q.id } }, data: { status: 'SUPERSEDED' } });
    await tx.quote.update({ where: { id: q.id }, data: { status: 'SENT', sentAt: new Date() } });
    const b = await tx.booking.findUniqueOrThrow({ where: { id: q.bookingId } });
    await tx.activity.create({ data: { leadId: b.leadId, actorId: u.id, type: 'quote_sent', body: note ?? `Quote v${q.version} sent`, meta: { bookingId: b.id, quoteId: q.id, version: q.version } } });
    await this.audit.record({ actorId: u.id, action: 'quote.send', entity: 'quote', entityId: q.id, after: { version: q.version }, ip }, tx);

    // Move the lead to QUOTE_SENT when the state machine allows it (from availability check or negotiation).
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: b.leadId }, include: { bookings: { include: FACTS } } });
    if (lead.stage !== 'QUOTE_SENT' && canTransitionLead(lead.stage, 'QUOTE_SENT', { actor: 'user', ownerId: lead.ownerId, bookings: lead.bookings.map(toFacts) }).ok) {
      await tx.lead.update({ where: { id: lead.id }, data: { stage: 'QUOTE_SENT' } });
      await tx.activity.create({ data: { leadId: lead.id, actorId: u.id, type: 'stage_change', body: 'Quote sent', meta: { from: lead.stage, to: 'QUOTE_SENT' } } });
    }
    // Delivery (PDF + email/WhatsApp link, T-183/184) is queued by the worker once it exists.
  }

  private assertFutureValidity(date: string) {
    if (date < todayIST()) throw new DomainError('QUOTE_VALIDITY_PAST', 'Pick a validity date from today onwards.', 400);
  }

  /** Merge the client's lines with the fields this user may not see (kept from the matching line). */
  private reconcile(input: QuoteInput, previous: LineRow[], u: AuthUserRef) {
    const payout = seesPayout(u);
    const finance = seesFinance(u);
    return input.lines.map((l, i) => {
      if (!payout && l.payoutRupees !== undefined) throw new ForbiddenError('Only talent managers and finance can set the talent payout.');
      if (!finance && l.internalCostRupees !== undefined) throw new ForbiddenError('Only finance can set internal costs.');
      const prev = l.id ? previous.find((p) => p.id === l.id) : undefined;
      if (l.id && !prev) throw new DomainError('UNKNOWN_LINE', `Line ${l.id} isn’t on the current version.`, 400);
      return {
        prevId: prev?.id,
        type: l.type,
        description: l.description,
        customerAmountPaise: rupeesToPaise(l.amountRupees),
        internalCostPaise: l.internalCostRupees !== undefined ? rupeesToPaise(l.internalCostRupees) : (prev?.internalCostPaise ?? 0n),
        payoutPaise: l.type !== 'TALENT_FEE' ? null : l.payoutRupees !== undefined ? (l.payoutRupees === null ? null : rupeesToPaise(l.payoutRupees)) : (prev?.payoutPaise ?? null),
        taxRateBps: input.gstBps,
        sortOrder: i,
      };
    });
  }

  /** Stored fields for a version: totals, plan and the QUO-6 reasons as of now. */
  private async content(tx: Tx, talentId: string, eventType: string, input: QuoteInput, lines: Omit<ReturnType<QuotesService['reconcile']>[number], 'prevId'>[]) {
    const t = calculateQuote(lines);
    const rc = await this.rateCard(tx, talentId, eventType);
    return {
      validUntil: endOfDayIST(input.validUntil),
      gstBps: input.gstBps,
      inclusions: input.inclusions,
      notes: input.notes,
      subtotalPaise: t.subtotalPaise,
      taxPaise: t.taxPaise,
      totalPaise: t.totalPaise,
      internalCostPaise: t.internalCostPaise,
      milestonePlan: input.milestones satisfies MilestonePlanItem[],
      approvalReasons: approvalReasons(t, { minimumRatePaise: rc?.minimumRatePaise ?? null, marginFloorBps: this.env.QUOTE_MARGIN_FLOOR_BPS }),
      lineItems: { create: lines },
    };
  }

  /** Recompute QUO-6 at send time (rate card or payout may have changed since the draft). */
  private async refreshReasons(tx: Tx, q: QuoteRow) {
    const b = await tx.booking.findUniqueOrThrow({ where: { id: q.bookingId }, include: { lead: { select: { eventType: true } } } });
    const rc = await this.rateCard(tx, b.talentId, b.lead.eventType);
    const reasons = approvalReasons(calculateQuote(q.lineItems.map(toCalc)), { minimumRatePaise: rc?.minimumRatePaise ?? null, marginFloorBps: this.env.QUOTE_MARGIN_FLOOR_BPS });
    await tx.quote.update({ where: { id: q.id }, data: { approvalReasons: reasons } });
    return reasons;
  }

  /** The event-type rate card, else the talent's general one. */
  private async rateCard(db: Tx | PrismaService, talentId: string, eventType: string) {
    const cards = await db.rateCard.findMany({ where: { talentId, OR: [{ eventType }, { eventType: null }] } });
    return cards.find((c) => c.eventType === eventType) ?? cards.find((c) => c.eventType === null) ?? null;
  }

  private async load(db: Tx | PrismaService, quoteId: string) {
    const q = await db.quote.findUnique({ where: { id: quoteId }, include: QUOTE_INCLUDE });
    if (!q) throw new NotFoundError('Quote', quoteId);
    return q;
  }
}

export const toCalc = (l: LineRow) => ({ type: l.type, customerAmountPaise: l.customerAmountPaise, internalCostPaise: l.internalCostPaise, payoutPaise: l.payoutPaise, taxRateBps: l.taxRateBps });
export const planOf = (q: Pick<QuoteRow, 'milestonePlan'>) => q.milestonePlan as MilestonePlanItem[];
/** The milestone plan with each amount worked out from the total. */
export const withAmounts = (q: Pick<QuoteRow, 'milestonePlan'>, totalPaise: bigint) => {
  const plan = planOf(q);
  const amounts = milestoneAmounts(totalPaise, plan);
  return plan.map((m, i) => ({ ...m, amountPaise: amounts[i]! }));
};
const payoutComplete = (lines: LineRow[]) => lines.filter((l) => l.type === 'TALENT_FEE').every((l) => l.payoutPaise != null);
