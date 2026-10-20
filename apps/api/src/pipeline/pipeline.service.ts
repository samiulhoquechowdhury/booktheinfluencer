import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AvailabilityStatus, LeadStage, Prisma } from '@repo/db';
import type { OpsChecklist } from '@repo/schemas';
import { assertAvailabilityChange, assertLeadTransition, formatINR, isConfirmable, nextLeadStages, type BookingFacts } from '@repo/utils';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, NotFoundError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { nextBookingRef } from './refs';

const rupees = (p: bigint | null) => (p == null ? null : Number(p / 100n));
const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** What the state machine needs per booking, loaded from the database (never trusted from clients). */
const FACTS_INCLUDE = {
  quotes: { select: { status: true } },
  contracts: { select: { status: true } },
  milestones: { select: { status: true, isAdvance: true } },
  payout: { select: { status: true } },
} satisfies Prisma.BookingInclude;
type BookingWithFacts = Prisma.BookingGetPayload<{ include: typeof FACTS_INCLUDE }>;

export function toFacts(b: BookingWithFacts): BookingFacts {
  const contract = b.contracts.find((c) => c.status === 'SIGNED') ?? b.contracts.find((c) => c.status !== 'VOID') ?? null;
  return {
    talentId: b.talentId,
    availability: b.availability,
    quoteStatuses: b.quotes.map((q) => q.status),
    contractStatus: contract?.status ?? null,
    advanceStatus: b.milestones.find((m) => m.isAdvance)?.status ?? null,
    milestoneStatuses: b.milestones.map((m) => m.status),
    repAcceptedAt: b.repAcceptedAt,
    payoutStatus: b.payout?.status ?? null,
  };
}

const WORKSPACE_INCLUDE = {
  owner: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true, email: true } },
  bookings: {
    orderBy: { createdAt: 'asc' },
    include: {
      ...FACTS_INCLUDE,
      talent: { select: { id: true, slug: true, stageName: true, tier: true, media: { where: { isCover: true }, take: 1, select: { key: true } } } },
    },
  },
  activities: { orderBy: { createdAt: 'desc' }, take: 100, include: { actor: { select: { name: true } } } },
} satisfies Prisma.LeadInclude;

export type PipelineQuery = {
  page: number;
  pageSize: number;
  stage?: LeadStage;
  ownerId?: string;
  city?: string;
  category?: string;
  from?: string;
  to?: string;
  q?: string;
};

/** Staff pipeline (PIPE-1..7, AVL-1..4). Stage and availability change only via the state machine. */
@Injectable()
export class PipelineService {
  private readonly log = new Logger('Pipeline');

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private where(q: Omit<PipelineQuery, 'page' | 'pageSize'>): Prisma.LeadWhereInput {
    return {
      stage: q.stage,
      ownerId: q.ownerId === 'unassigned' ? null : q.ownerId,
      city: q.city,
      eventDate: q.from || q.to ? { gte: q.from ? new Date(`${q.from}T00:00:00Z`) : undefined, lte: q.to ? new Date(`${q.to}T00:00:00Z`) : undefined } : undefined,
      bookings: q.category ? { some: { talent: { categories: { some: { category: { slug: q.category } } } } } } : undefined,
      OR: q.q
        ? [{ ref: { contains: q.q, mode: 'insensitive' } }, { companyName: { contains: q.q, mode: 'insensitive' } }, { customer: { name: { contains: q.q, mode: 'insensitive' } } }, { bookings: { some: { talent: { stageName: { contains: q.q, mode: 'insensitive' } } } } }]
        : undefined,
    };
  }

  private card(l: Prisma.LeadGetPayload<{ include: { owner: { select: { id: true; name: true } }; customer: { select: { name: true } }; bookings: { select: { availability: true; talent: { select: { stageName: true } } } } } }>) {
    return {
      id: l.id,
      ref: l.ref,
      stage: l.stage,
      eventType: l.eventType,
      eventDate: isoDay(l.eventDate),
      city: l.city,
      customer: l.customer.name,
      company: l.companyName,
      owner: l.owner,
      talents: l.bookings.map((b) => ({ name: b.talent.stageName, availability: b.availability })),
      budget: { minRupees: rupees(l.budgetMinPaise), maxRupees: rupees(l.budgetMaxPaise) },
      updatedAt: l.updatedAt.toISOString(),
    };
  }

  private readonly cardInclude = {
    owner: { select: { id: true, name: true } },
    customer: { select: { name: true } },
    bookings: { select: { availability: true, talent: { select: { stageName: true } } } },
  } as const;

  /** PIPE-2 table view. */
  async list(q: PipelineQuery) {
    const where = this.where(q);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({ where, include: this.cardInclude, orderBy: { updatedAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.lead.count({ where }),
    ]);
    return { data: rows.map((l) => this.card(l)), meta: { page: q.page, pageSize: q.pageSize, total } };
  }

  /** PIPE-2 Kanban: every stage with its count and the most recent cards. */
  async board(q: Omit<PipelineQuery, 'page' | 'pageSize' | 'stage'>, perStage = 20) {
    const where = this.where(q);
    const counts = await this.prisma.lead.groupBy({ by: ['stage'], where, _count: true });
    const stages = await Promise.all(
      (['NEW', 'CONTACTED', 'REQUIREMENT_RECEIVED', 'SHORTLISTED', 'AVAILABILITY_CHECK', 'QUOTE_SENT', 'NEGOTIATION', 'ADVANCE_PENDING', 'CONFIRMED', 'EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED', 'LOST', 'CANCELLED'] as const).map(async (stage) => ({
        stage,
        count: counts.find((c) => c.stage === stage)?._count ?? 0,
        cards: (await this.prisma.lead.findMany({ where: { ...where, stage }, include: this.cardInclude, orderBy: { updatedAt: 'desc' }, take: perStage })).map((l) => this.card(l)),
      })),
    );
    return stages;
  }

  /** PIPE-6 lead workspace. */
  async workspace(id: string) {
    const l = await this.prisma.lead.findUnique({ where: { id }, include: WORKSPACE_INCLUDE });
    if (!l) throw new NotFoundError('Lead', id);
    return {
      id: l.id,
      ref: l.ref,
      stage: l.stage,
      nextStages: nextLeadStages(l.stage),
      lostReason: l.lostReason,
      owner: l.owner,
      customer: l.customer, // staff may see contact details (trd §7)
      brief: {
        eventType: l.eventType,
        eventDate: isoDay(l.eventDate),
        altDate: isoDay(l.altDate),
        city: l.city,
        venue: l.venue,
        audienceSize: l.audienceSize,
        durationMins: l.durationMins,
        startTime: l.startTime,
        budget: { minRupees: rupees(l.budgetMinPaise), maxRupees: rupees(l.budgetMaxPaise) },
        language: l.language,
        notes: l.notes,
        companyName: l.companyName,
        gstin: l.gstin,
        source: l.source,
      },
      bookings: l.bookings.map((b) => ({
        id: b.id,
        ref: b.ref,
        talent: { id: b.talent.id, slug: b.talent.slug, name: b.talent.stageName, tier: b.talent.tier, cover: b.talent.media[0]?.key ?? null },
        availability: b.availability,
        repAcceptedAt: b.repAcceptedAt?.toISOString() ?? null,
        confirmedAt: b.confirmedAt?.toISOString() ?? null,
        quoteStatuses: b.quotes.map((q) => q.status),
        confirmable: isConfirmable(toFacts(b)),
        opsChecklist: b.opsChecklist,
        cancelledAt: b.cancelledAt?.toISOString() ?? null,
      })),
      activity: l.activities.map((a) => ({ id: a.id, type: a.type, body: a.body, meta: a.meta, actor: a.actor?.name ?? null, at: a.createdAt.toISOString() })),
      createdAt: l.createdAt.toISOString(),
    };
  }

  private async loadForChange(tx: Prisma.TransactionClient, id: string) {
    const lead = await tx.lead.findUnique({ where: { id }, include: { bookings: { include: FACTS_INCLUDE } } });
    if (!lead) throw new NotFoundError('Lead', id);
    return lead;
  }

  /** PIPE-3/4/5: state-machine transition, logged with actor, time and note. */
  async transition(id: string, body: { to: LeadStage; reason?: string; completionNote?: string; note?: string; policyRef?: string }, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const lead = await this.loadForChange(tx, id);
      assertLeadTransition(lead.stage, body.to, { actor: 'user', ownerId: lead.ownerId, bookings: lead.bookings.map(toFacts), reason: body.reason, completionNote: body.completionNote });

      await tx.lead.update({ where: { id }, data: { stage: body.to, lostReason: body.to === 'LOST' ? body.reason! : undefined } });
      if (body.to === 'CANCELLED') await this.cancelBookings(tx, id, body.reason!, body.policyRef, actor);
      if (body.to === 'SETTLEMENT') await tx.booking.updateMany({ where: { leadId: id, availability: 'CONFIRMED' }, data: { completionNote: body.completionNote! } });
      if (body.to === 'EVENT_COMPLETED') await this.completeBookings(tx, id, actor);

      const note = body.reason ?? body.completionNote ?? body.note ?? null;
      await tx.activity.create({ data: { leadId: id, actorId: actor.id, type: 'stage_change', body: note, meta: { from: lead.stage, to: body.to } } });
      await this.audit.record({ actorId: actor.id, action: 'lead.transition', entity: 'lead', entityId: id, before: { stage: lead.stage }, after: { stage: body.to, note }, ip }, tx);
    });
    return this.workspace(id);
  }

  /** OPS-4 / SET-1: confirmed bookings are completed and get a payout record for the contracted payout. */
  private async completeBookings(tx: Prisma.TransactionClient, leadId: string, actor: AuthUserRef) {
    const bookings = await tx.booking.findMany({ where: { leadId, availability: 'CONFIRMED', cancelledAt: null }, include: { payout: true, talent: { select: { stageName: true } } } });
    for (const b of bookings) {
      await tx.booking.update({ where: { id: b.id }, data: { completedAt: b.completedAt ?? new Date() } });
      if (b.payout || b.payoutTotalPaise == null) continue;
      const payout = await tx.payout.create({ data: { bookingId: b.id, amountPaise: b.payoutTotalPaise } });
      await tx.activity.create({ data: { leadId, actorId: actor.id, type: 'payout_created', body: `Payout due to ${b.talent.stageName}`, meta: { bookingId: b.id, payoutId: payout.id } } });
    }
  }

  /** OPS-5: close what's still open; money already received goes to a refund review (refunds are manual in the MVP, PAY-6). */
  private async cancelBookings(tx: Prisma.TransactionClient, leadId: string, reason: string, policyRef: string | undefined, actor: AuthUserRef) {
    const bookings = await tx.booking.findMany({ where: { leadId, cancelledAt: null }, include: { milestones: { include: { payments: true } } } });
    for (const b of bookings) {
      await tx.booking.update({ where: { id: b.id }, data: { cancelledAt: new Date(), cancelReason: reason, cancelPolicyRef: policyRef ?? null } });
      await tx.paymentMilestone.updateMany({ where: { bookingId: b.id, status: { in: ['PENDING', 'LINK_SENT', 'OVERDUE'] } }, data: { status: 'CANCELLED' } });
      await tx.contract.updateMany({ where: { bookingId: b.id, status: { in: ['DRAFT', 'SENT', 'PARTIALLY_SIGNED'] } }, data: { status: 'VOID' } });
      await tx.payout.updateMany({ where: { bookingId: b.id, status: { in: ['PENDING', 'SCHEDULED'] } }, data: { status: 'ON_HOLD' } });
      const paid = b.milestones.flatMap((m) => m.payments).filter((p) => p.status === 'captured').reduce((a, p) => a + p.amountPaise, 0n);
      if (paid > 0n)
        await tx.activity.create({ data: { leadId, actorId: actor.id, type: 'refund_review', body: `${formatINR(paid)} received; review the refund${policyRef ? ` under ${policyRef}` : ''}`, meta: { bookingId: b.id, paidPaise: paid.toString(), policyRef: policyRef ?? null } } });
    }
  }

  /** OPS-3: the booking's ops checklist (travel, hotel, transport, rider, reporting time, contact). */
  async setOpsChecklist(bookingId: string, checklist: OpsChecklist, actor: AuthUserRef, ip?: string) {
    const leadId = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!b) throw new NotFoundError('Booking', bookingId);
      await tx.booking.update({ where: { id: bookingId }, data: { opsChecklist: checklist as Prisma.InputJsonValue } });
      await this.audit.record({ actorId: actor.id, action: 'booking.ops', entity: 'booking', entityId: bookingId, after: { reportingTime: checklist.reportingTime }, ip }, tx);
      return b.leadId;
    });
    return this.workspace(leadId);
  }

  /** Brief details staff agree after the enquiry (the form doesn't ask for a start time). */
  async updateBrief(id: string, b: { startTime: string | null }, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id } });
      if (!lead) throw new NotFoundError('Lead', id);
      await tx.lead.update({ where: { id }, data: { startTime: b.startTime } });
      await this.audit.record({ actorId: actor.id, action: 'lead.brief', entity: 'lead', entityId: id, before: { startTime: lead.startTime }, after: b, ip }, tx);
    });
    return this.workspace(id);
  }

  /** PIPE-6 internal note. */
  async addNote(id: string, text: string, actor: AuthUserRef) {
    if (!(await this.prisma.lead.findUnique({ where: { id } }))) throw new NotFoundError('Lead', id);
    const a = await this.prisma.activity.create({ data: { leadId: id, actorId: actor.id, type: 'note', body: text } });
    return { id: a.id, type: a.type, body: a.body, at: a.createdAt.toISOString() };
  }

  async assignOwner(id: string, ownerId: string | null, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id } });
      if (!lead) throw new NotFoundError('Lead', id);
      if (ownerId) {
        const owner = await tx.user.findFirst({ where: { id: ownerId, deletedAt: null } });
        if (!owner || !owner.roles.some((r) => r === 'SALES' || r === 'SUPER_ADMIN' || r === 'TALENT_MANAGER')) throw new DomainError('BAD_OWNER', 'Leads can be assigned only to sales staff.', 400);
      }
      await tx.lead.update({ where: { id }, data: { ownerId } });
      await tx.activity.create({ data: { leadId: id, actorId: actor.id, type: 'assigned', body: ownerId ? 'Owner changed' : 'Owner removed', meta: { from: lead.ownerId, to: ownerId } } });
      await this.audit.record({ actorId: actor.id, action: 'lead.owner', entity: 'lead', entityId: id, before: { ownerId: lead.ownerId }, after: { ownerId }, ip }, tx);
    });
    return this.workspace(id);
  }

  /** Shortlist: add a published talent to the lead (one booking per talent). */
  async addBooking(leadId: string, talentSlug: string, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw new NotFoundError('Lead', leadId);
      if (['CONFIRMED', 'EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED', 'LOST', 'CANCELLED'].includes(lead.stage)) throw new DomainError('LEAD_LOCKED', 'Talent can’t be added at this stage.', 409);
      const talent = await tx.talent.findFirst({ where: { slug: talentSlug, status: 'PUBLISHED' } });
      if (!talent) throw new NotFoundError('Talent', talentSlug);
      const booking = await tx.booking.create({ data: { ref: await nextBookingRef(tx), leadId, talentId: talent.id } });
      await tx.activity.create({ data: { leadId, actorId: actor.id, type: 'talent_added', body: talent.stageName, meta: { bookingId: booking.id } } });
      await this.audit.record({ actorId: actor.id, action: 'lead.booking.add', entity: 'lead', entityId: leadId, after: { bookingId: booking.id, talent: talent.slug }, ip }, tx);
    });
    return this.workspace(leadId);
  }

  /** Remove a talent that hasn't progressed (no quote yet, not confirmed). */
  async removeBooking(leadId: string, bookingId: string, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findFirst({ where: { id: bookingId, leadId }, include: { quotes: { select: { id: true } }, talent: { select: { stageName: true } } } });
      if (!b) throw new NotFoundError('Booking', bookingId);
      if (b.quotes.length || b.availability === 'CONFIRMED') throw new DomainError('BOOKING_LOCKED', 'This talent already has a quote or confirmation; cancel instead of removing.', 409);
      await tx.booking.delete({ where: { id: bookingId } });
      await tx.activity.create({ data: { leadId, actorId: actor.id, type: 'talent_removed', body: b.talent.stageName } });
      await this.audit.record({ actorId: actor.id, action: 'lead.booking.remove', entity: 'lead', entityId: leadId, before: { bookingId, ref: b.ref }, ip }, tx);
    });
    return this.workspace(leadId);
  }

  private async bookingWithLead(tx: Prisma.TransactionClient, bookingId: string) {
    const b = await tx.booking.findUnique({ where: { id: bookingId }, include: { ...FACTS_INCLUDE, talent: { select: { stageName: true } } } });
    if (!b) throw new NotFoundError('Booking', bookingId);
    return b;
  }

  /** AVL-1/3: staff move between working statuses; CONFIRMED is never set by hand. */
  async setAvailability(bookingId: string, status: AvailabilityStatus, note: string | undefined, actor: AuthUserRef, ip?: string) {
    const leadId = await this.prisma.$transaction(async (tx) => {
      const b = await this.bookingWithLead(tx, bookingId);
      assertAvailabilityChange(b.availability, status, { actor: 'user', booking: toFacts(b) });
      await tx.booking.update({ where: { id: bookingId }, data: { availability: status } });
      await tx.activity.create({ data: { leadId: b.leadId, actorId: actor.id, type: 'availability', body: note ?? null, meta: { bookingId, talent: b.talent.stageName, from: b.availability, to: status } } });
      await this.audit.record({ actorId: actor.id, action: 'booking.availability', entity: 'booking', entityId: bookingId, before: { availability: b.availability }, after: { availability: status, note }, ip }, tx);
      return b.leadId;
    });
    return this.workspace(leadId);
  }

  /** The representative accepted the booking (one of the four confirmation conditions). */
  async recordRepAcceptance(bookingId: string, note: string | undefined, actor: AuthUserRef, ip?: string) {
    const leadId = await this.prisma.$transaction(async (tx) => {
      const b = await this.bookingWithLead(tx, bookingId);
      if (b.repAcceptedAt) throw new DomainError('ALREADY_ACCEPTED', 'The representative’s acceptance is already recorded.', 409);
      if (b.availability !== 'AVAILABLE' && b.availability !== 'TENTATIVE') throw new DomainError('NOT_AVAILABLE', 'Mark the talent available before recording acceptance.', 409);
      await tx.booking.update({ where: { id: bookingId }, data: { repAcceptedAt: new Date() } });
      await tx.activity.create({ data: { leadId: b.leadId, actorId: actor.id, type: 'rep_accepted', body: note ?? null, meta: { bookingId, talent: b.talent.stageName } } });
      await this.audit.record({ actorId: actor.id, action: 'booking.rep_accepted', entity: 'booking', entityId: bookingId, after: { note }, ip }, tx);
      return b.leadId;
    });
    await this.evaluateConfirmation(bookingId);
    return this.workspace(leadId);
  }

  /**
   * Confirmation rule (trd §5, rules.md §0.1), the only path to CONFIRMED. Call after each of:
   * quote accepted, contract signed, advance paid, rep accepted. Idempotent.
   */
  async evaluateConfirmation(bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const b = await this.bookingWithLead(tx, bookingId);
      if (b.availability === 'CONFIRMED' || !isConfirmable(toFacts(b))) return false;
      const lead = await this.loadForChange(tx, b.leadId);
      assertAvailabilityChange(b.availability, 'CONFIRMED', { actor: 'system', booking: toFacts(b) });
      await tx.booking.update({ where: { id: bookingId }, data: { availability: 'CONFIRMED', confirmedAt: new Date() } });
      if (lead.stage === 'ADVANCE_PENDING') {
        const facts = lead.bookings.map((x) => (x.id === bookingId ? { ...toFacts(x), availability: 'CONFIRMED' as const } : toFacts(x)));
        assertLeadTransition('ADVANCE_PENDING', 'CONFIRMED', { actor: 'system', ownerId: lead.ownerId, bookings: facts });
        await tx.lead.update({ where: { id: lead.id }, data: { stage: 'CONFIRMED' } });
      }
      await tx.activity.create({ data: { leadId: b.leadId, type: 'confirmed', body: `${b.talent.stageName} confirmed`, meta: { bookingId } } });
      await this.audit.record({ actorId: null, action: 'booking.confirmed', entity: 'booking', entityId: bookingId, after: { availability: 'CONFIRMED' } }, tx);
      // booking.confirmed notifications go through the worker once it exists (NOT-*).
      this.log.log(`Booking ${b.ref} confirmed automatically`);
      return true;
    });
  }
}
