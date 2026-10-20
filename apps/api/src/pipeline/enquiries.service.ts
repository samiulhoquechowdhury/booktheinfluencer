import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { Enquiry } from '@repo/schemas';
import { TERMINAL_STAGES } from '@repo/utils';
import { OtpService, toE164 } from '../auth/otp.service';
import { DomainError, ForbiddenError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { nextBookingRef, nextLeadRef } from './refs';

/** trd §10: enquiry 5 / hour per IP. */
export const ENQUIRY_LIMIT = 5;
export const EXPECTED_RESPONSE_HOURS = 24;

const rupees = (r: number) => BigInt(r) * 100n;

/**
 * Public enquiry (ENQ-1..5, AUTH-4): verifies the phone with the OTP the customer entered, finds or
 * creates their account, then creates a NEW lead with one draft booking per chosen published talent
 * and assigns a sales owner (round robin = fewest open leads).
 */
@Injectable()
export class EnquiriesService {
  private readonly log = new Logger('Enquiries');

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OtpService) private readonly otp: OtpService,
  ) {}

  private async assertNotRateLimited(ip: string | undefined) {
    if (!ip) return;
    const recent = await this.prisma.lead.count({ where: { createdIp: ip, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
    if (recent >= ENQUIRY_LIMIT) throw new DomainError('RATE_LIMITED', 'Too many briefs from this connection. Try again in an hour, or call us.', 429, { retryAfterSeconds: 3600 });
  }

  /** ENQ-5 / T-167: the sales person with the fewest open leads (ties: longest-standing account). */
  private async pickOwner(tx: Prisma.TransactionClient) {
    const sales = await tx.user.findMany({
      where: { roles: { has: 'SALES' }, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, _count: { select: { ownedLeads: { where: { stage: { notIn: [...TERMINAL_STAGES] } } } } } },
    });
    if (!sales.length) return null;
    return sales.reduce((best, u) => (u._count.ownedLeads < best._count.ownedLeads ? u : best)).id;
  }

  async submit(input: Enquiry, ip: string | undefined) {
    await this.assertNotRateLimited(ip);
    const phone = toE164(input.contact.phone);
    await this.otp.checkCode(phone, input.contact.otp);

    const result = await this.prisma.$transaction(async (tx) => {
      // AUTH-4: account auto-created on OTP verify.
      const existing = await tx.user.findUnique({ where: { phone } });
      if (existing?.deletedAt) throw new ForbiddenError('This account has been closed. Contact support to restore it.');
      const customer = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name: existing.name ?? input.contact.name, email: existing.email ?? (await this.freeEmail(tx, input.contact.email)), roles: existing.roles.includes('CUSTOMER') ? undefined : { push: 'CUSTOMER' } },
          })
        : await tx.user.create({ data: { phone, name: input.contact.name, email: await this.freeEmail(tx, input.contact.email), roles: ['CUSTOMER'] } });

      const talents = input.talent.talentSlugs.length
        ? await tx.talent.findMany({ where: { slug: { in: input.talent.talentSlugs }, status: 'PUBLISHED' }, select: { id: true, slug: true } })
        : [];
      const ownerId = await this.pickOwner(tx);
      const ref = await nextLeadRef(tx);
      const lead = await tx.lead.create({
        data: {
          ref,
          stage: 'NEW',
          ownerId,
          customerId: customer.id,
          eventType: input.event.eventType,
          eventDate: new Date(`${input.event.date}T00:00:00.000Z`),
          altDate: input.event.altDate ? new Date(`${input.event.altDate}T00:00:00.000Z`) : null,
          city: input.event.city,
          venue: input.event.venue,
          audienceSize: input.event.audienceSize,
          durationMins: input.event.durationMins,
          budgetMinPaise: rupees(input.talent.budgetMinRupees),
          budgetMaxPaise: rupees(input.talent.budgetMaxRupees),
          language: input.talent.language ?? null,
          notes: input.talent.notes || null,
          companyName: input.contact.company || null,
          gstin: input.contact.gstin || null,
          source: 'web',
          createdIp: ip ?? null,
          activities: { create: { type: 'brief_received', body: 'Brief received', actorId: customer.id } },
        },
      });
      // Keep the customer's order of choice.
      const ordered = input.talent.talentSlugs.map((s) => talents.find((t) => t.slug === s)).filter((t): t is { id: string; slug: string } => Boolean(t));
      const bookingRefs: string[] = [];
      for (const t of ordered) {
        const bookingRef = await nextBookingRef(tx);
        await tx.booking.create({ data: { ref: bookingRef, leadId: lead.id, talentId: t.id } });
        bookingRefs.push(bookingRef);
      }
      if (ownerId) await tx.activity.create({ data: { leadId: lead.id, type: 'assigned', body: 'Assigned automatically', meta: { ownerId } } });
      return { customer, ref, bookingRefs };
    });

    // NOT-1 acknowledgement (email + SMS) goes through the notifications worker once it exists.
    this.log.log(`Enquiry ${result.ref} received (${result.bookingRefs.length} talent)`);
    return { ...result, expectedResponseHours: EXPECTED_RESPONSE_HOURS };
  }

  /** Emails are unique per account; if another account already uses it, don't attach it here. */
  private async freeEmail(tx: Prisma.TransactionClient, email: string) {
    const owner = await tx.user.findUnique({ where: { email: email.toLowerCase() } });
    return owner ? null : email.toLowerCase();
  }
}
