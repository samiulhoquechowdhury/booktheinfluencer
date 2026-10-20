import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { AnalyticsQuery } from '@repo/schemas';
import { LEAD_STAGES } from '@repo/utils';
import type { AuthUserRef } from '../auth/guards';
import { PrismaService } from '../prisma/prisma.service';
import { seesFinance, todayIST } from '../quotes/quote-access';

const sum = (xs: (bigint | null)[]) => xs.reduce<bigint>((a, x) => a + (x ?? 0n), 0n);
const bps = (n: number, d: number) => (d === 0 ? 0 : Math.floor((n * 10_000) / d));

/**
 * ANA-1..3 (T-244). Scoped to leads created in the date range (IST days) and the filters. Money is
 * paise as strings. Margin, receivables and payouts only for finance (trd §7).
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async dashboard(q: AnalyticsQuery, u: AuthUserRef) {
    const lead: Prisma.LeadWhereInput = {
      createdAt: q.from || q.to ? { gte: q.from ? new Date(`${q.from}T00:00:00+05:30`) : undefined, lte: q.to ? new Date(`${q.to}T23:59:59.999+05:30`) : undefined } : undefined,
      city: q.city,
      ownerId: q.ownerId,
      bookings: q.category ? { some: { talent: { categories: { some: { category: { slug: q.category } } } } } } : undefined,
    };
    const confirmedWhere: Prisma.BookingWhereInput = { lead, confirmedAt: { not: null }, cancelledAt: null };

    const [leads, byStage, quotedLeads, confirmedLeads, confirmed] = await Promise.all([
      this.prisma.lead.count({ where: lead }),
      this.prisma.lead.groupBy({ by: ['stage'], where: lead, _count: true }),
      this.prisma.lead.count({ where: { ...lead, bookings: { some: { ...(lead.bookings?.some ?? {}), quotes: { some: { sentAt: { not: null } } } } } } }),
      this.prisma.lead.count({ where: { ...lead, bookings: { some: { ...(lead.bookings?.some ?? {}), confirmedAt: { not: null } } } } }),
      this.prisma.booking.findMany({ where: confirmedWhere, select: { sellingTotalPaise: true, marginPaise: true, confirmedAt: true, lead: { select: { createdAt: true } } } }),
    ]);

    const gmv = sum(confirmed.map((b) => b.sellingTotalPaise));
    const hours = confirmed.map((b) => (b.confirmedAt!.getTime() - b.lead.createdAt.getTime()) / 3_600_000);
    const out = {
      filters: q,
      leads,
      leadsByStage: Object.fromEntries(LEAD_STAGES.map((s) => [s, byStage.find((r) => r.stage === s)?._count ?? 0])),
      bookingsConfirmed: confirmed.length,
      gmvPaise: gmv.toString(),
      avgBookingValuePaise: confirmed.length ? (gmv / BigInt(confirmed.length)).toString() : '0',
      conversion: { enquiryToQuoteBps: bps(quotedLeads, leads), quoteToConfirmedBps: bps(confirmedLeads, quotedLeads) },
      avgHoursToConfirm: hours.length ? Math.round((hours.reduce((a, h) => a + h, 0) / hours.length) * 10) / 10 : null,
    };
    if (!seesFinance(u)) return out;

    const today = new Date(`${todayIST()}T00:00:00.000Z`);
    const [open, payouts] = await Promise.all([
      this.prisma.paymentMilestone.findMany({ where: { status: { in: ['PENDING', 'LINK_SENT', 'OVERDUE'] }, booking: { lead, cancelledAt: null } }, select: { amountPaise: true, dueDate: true } }),
      this.prisma.payout.findMany({ where: { status: { in: ['PENDING', 'SCHEDULED'] }, booking: { lead } }, select: { amountPaise: true } }),
    ]);
    return {
      ...out,
      finance: {
        marginPaise: sum(confirmed.map((b) => b.marginPaise)).toString(),
        receivablesPaise: sum(open.map((m) => m.amountPaise)).toString(),
        overduePaise: sum(open.filter((m) => m.dueDate < today).map((m) => m.amountPaise)).toString(),
        pendingPayouts: { count: payouts.length, amountPaise: sum(payouts.map((p) => p.amountPaise)).toString() },
      },
    };
  }
}
