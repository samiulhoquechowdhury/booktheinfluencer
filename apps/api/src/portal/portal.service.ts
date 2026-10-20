import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { BlackoutSchema, OpsChecklist, TalentBookingSchema, TalentPayoutSchema } from '@repo/schemas';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, ForbiddenError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { toBookingEvent } from '../quotes/booking-event';
import { todayIST } from '../quotes/quote-access';

/** Wire shapes (money as decimal strings). */
type TalentBooking = z.input<typeof TalentBookingSchema>;
type TalentPayout = z.input<typeof TalentPayoutSchema>;
type Blackout = z.input<typeof BlackoutSchema>;

const BOOKING_INCLUDE = {
  lead: { include: { owner: { select: { name: true, phone: true } } } },
  contracts: { select: { status: true } },
  payout: true,
} satisfies Prisma.BookingInclude;

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Talent portal (TAL-1..3, T-222/223). A talent login is linked by invite (Talent.userId); a rep
 * login sees the talents they represent. Talent see their payout only, never the selling price,
 * margin or the customer's contact details (trd §7).
 */
@Injectable()
export class PortalService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** The talent profiles this login may act for (first = the one the portal shows). */
  private async talents(u: AuthUserRef) {
    const rows = await this.prisma.talent.findMany({ where: { OR: [{ userId: u.id }, { reps: { some: { rep: { userId: u.id } } } }] }, orderBy: { stageName: 'asc' } });
    if (!rows.length) throw new ForbiddenError('No talent profile is linked to this login yet. Ask your talent manager for an invite.');
    return rows;
  }

  async profile(u: AuthUserRef) {
    const [t] = await this.talents(u);
    return { talentSlug: t!.slug, name: t!.stageName, blackoutEditable: t!.blackoutSelfEdit };
  }

  /** TAL-1/2: bookings the talent has been asked about (internal shortlists stay internal). */
  async bookings(u: AuthUserRef): Promise<TalentBooking[]> {
    const ids = (await this.talents(u)).map((t) => t.id);
    const rows = await this.prisma.booking.findMany({
      where: { talentId: { in: ids }, availability: { not: 'NOT_CHECKED' }, lead: { stage: { not: 'LOST' } } },
      include: BOOKING_INCLUDE,
      orderBy: { lead: { eventDate: 'asc' } },
    });
    return rows.map((b) => {
      const signed = b.contracts.some((c) => c.status === 'SIGNED');
      const sent = b.contracts.some((c) => c.status === 'SENT' || c.status === 'PARTIALLY_SIGNED');
      const payout = b.payout?.amountPaise ?? b.payoutTotalPaise;
      const ops = b.opsChecklist as Pick<OpsChecklist, 'reportingTime' | 'pointOfContact'> | null;
      return {
        ref: b.ref,
        event: toBookingEvent(b.lead),
        availability: b.availability,
        contract: signed ? 'SIGNED' : sent ? 'SENT' : 'NOT_SENT',
        payoutPaise: payout == null ? null : payout.toString(),
        reportingTime: ops?.reportingTime ?? null,
        pointOfContact: ops?.pointOfContact ? `${ops.pointOfContact.name} · +91${ops.pointOfContact.phone}` : this.contact(b.lead.owner),
      };
    });
  }

  private contact(owner: { name: string | null; phone: string | null } | null) {
    const phone = owner?.phone ?? this.env.SUPPORT_PHONE;
    return [owner?.name ?? 'BookTheInfluencer desk', phone].filter(Boolean).join(' · ');
  }

  async payouts(u: AuthUserRef): Promise<TalentPayout[]> {
    const ids = (await this.talents(u)).map((t) => t.id);
    const rows = await this.prisma.payout.findMany({ where: { booking: { talentId: { in: ids } } }, include: { booking: { include: { lead: true } } } });
    return rows
      .sort((a, b) => a.booking.lead.eventDate.getTime() - b.booking.lead.eventDate.getTime())
      .map((p) => ({
        id: p.id,
        bookingRef: p.booking.ref,
        eventTitle: toBookingEvent(p.booking.lead).title,
        eventDate: day(p.booking.lead.eventDate),
        amountPaise: p.amountPaise.toString(),
        status: p.status === 'PAID' ? 'PAID' : p.status === 'SCHEDULED' ? 'SCHEDULED' : 'PENDING',
        paidAt: p.paidAt?.toISOString() ?? null,
        reference: p.status === 'PAID' ? p.reference : null,
      }));
  }

  async blackouts(u: AuthUserRef): Promise<Blackout[]> {
    const [t] = await this.talents(u);
    const rows = await this.prisma.blackout.findMany({ where: { talentId: t!.id }, orderBy: { date: 'asc' } });
    return rows.map((b) => ({ date: day(b.date), reason: b.note }));
  }

  /** TAL-3: add (on) or remove (off) a blackout, if the admin enabled self-editing. */
  async setBlackout(date: string, on: boolean, reason: string | null, u: AuthUserRef, ip?: string) {
    const [t] = await this.talents(u);
    if (!t!.blackoutSelfEdit) throw new DomainError('BLACKOUT_LOCKED', 'Blackout editing is turned off for your profile. Ask your talent manager.', 403);
    if (date < todayIST()) throw new DomainError('PAST_DATE', 'You can’t change past dates.', 422);
    const at = new Date(`${date}T00:00:00.000Z`);
    if (on && (await this.prisma.booking.findFirst({ where: { talentId: t!.id, availability: 'CONFIRMED', lead: { eventDate: at } } })))
      throw new DomainError('HAS_BOOKING', 'You have a confirmed booking on this date.', 409);
    await this.prisma.$transaction(async (tx) => {
      if (on) await tx.blackout.upsert({ where: { talentId_date: { talentId: t!.id, date: at } }, update: { note: reason }, create: { talentId: t!.id, date: at, note: reason } });
      else await tx.blackout.deleteMany({ where: { talentId: t!.id, date: at } });
      await this.audit.record({ actorId: u.id, action: on ? 'blackout.add' : 'blackout.remove', entity: 'talent', entityId: t!.id, after: { date, by: 'talent' }, ip }, tx);
    });
    return this.blackouts(u);
  }
}
