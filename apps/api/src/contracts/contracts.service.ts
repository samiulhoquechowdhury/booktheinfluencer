import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, NotFoundError } from '../common/errors';
import { ingestOnce } from '../common/webhooks';
import { PipelineService } from '../pipeline/pipeline.service';
import { PrismaService } from '../prisma/prisma.service';
import { ESIGN_PROVIDER, type ESignEvent, type ESignProvider } from './esign';

type Headers = Record<string, string | string[] | undefined>;
const view = (c: { id: string; status: string; providerRef: string | null; documentId: string | null; sentAt: Date | null; signedAt: Date | null }) => ({
  id: c.id,
  status: c.status,
  sentAt: c.sentAt?.toISOString() ?? null,
  signedAt: c.signedAt?.toISOString() ?? null,
  hasDocument: Boolean(c.documentId),
  providerRef: c.providerRef,
});

/**
 * Contracts (CON-2/3, T-201/202). Sent for e-signature after the customer accepts a quote; status
 * changes only through the verified e-sign webhook. A signed contract is one of the four
 * confirmation conditions. PDF generation and the signed-PDF vault wait for the worker and storage.
 */
@Injectable()
export class ContractsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(PipelineService) private readonly pipeline: PipelineService,
    @Inject(ESIGN_PROVIDER) private readonly esign: ESignProvider,
  ) {}

  async forBooking(bookingId: string) {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { contracts: { orderBy: { sentAt: 'desc' } } } });
    if (!b) throw new NotFoundError('Booking', bookingId);
    return b.contracts.map(view);
  }

  async send(bookingId: string, includeRep: boolean, u: AuthUserRef, ip?: string) {
    const b = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        quotes: { where: { status: 'ACCEPTED' }, select: { id: true } },
        contracts: true,
        lead: { include: { customer: { select: { name: true, email: true, phone: true } } } },
        talent: { select: { stageName: true, reps: { take: 1, include: { rep: true } } } },
      },
    });
    if (!b) throw new NotFoundError('Booking', bookingId);
    if (!b.quotes.length) throw new DomainError('QUOTE_NOT_ACCEPTED', 'Send the contract after the customer accepts a quote.', 409);
    if (b.cancelledAt) throw new DomainError('BOOKING_CANCELLED', 'This booking is cancelled.', 409);
    if (b.contracts.some((c) => c.status !== 'VOID')) throw new DomainError('CONTRACT_EXISTS', 'A contract is already out for this booking; void it to send a new one.', 409);
    const rep = b.talent.reps[0]?.rep;
    if (includeRep && !rep) throw new DomainError('NO_REP', 'This talent has no representative to sign.', 409);

    const contract = await this.prisma.contract.create({ data: { bookingId } });
    const signers = [
      { role: 'customer' as const, name: b.lead.customer.name ?? 'Customer', email: b.lead.customer.email, phone: b.lead.customer.phone },
      ...(includeRep && rep ? [{ role: 'rep' as const, name: rep.name, email: rep.email, phone: rep.phone }] : []),
    ];
    try {
      const { providerRef } = await this.esign.createEnvelope({ contractId: contract.id, title: `Booking agreement ${b.ref} · ${b.talent.stageName}`, signers });
      await this.prisma.$transaction(async (tx) => {
        await tx.contract.update({ where: { id: contract.id }, data: { providerRef, status: 'SENT', sentAt: new Date() } });
        await tx.activity.create({ data: { leadId: b.leadId, actorId: u.id, type: 'contract_sent', body: 'Contract sent for e-signature', meta: { bookingId, contractId: contract.id, signers: signers.map((s) => s.role) } } });
        await this.audit.record({ actorId: u.id, action: 'contract.send', entity: 'contract', entityId: contract.id, after: { bookingId, signers: signers.map((s) => s.role) }, ip }, tx);
      });
    } catch (err) {
      // Never leave a draft that blocks a retry when the provider call fails.
      await this.prisma.contract.delete({ where: { id: contract.id } });
      throw err;
    }
    return this.forBooking(bookingId);
  }

  async void(contractId: string, reason: string, u: AuthUserRef, ip?: string) {
    const c = await this.prisma.contract.findUnique({ where: { id: contractId }, include: { booking: true } });
    if (!c) throw new NotFoundError('Contract', contractId);
    if (c.status === 'SIGNED') throw new DomainError('CONTRACT_SIGNED', 'A signed contract can’t be voided; cancel the booking instead.', 409);
    if (c.status === 'VOID') throw new DomainError('CONTRACT_VOID', 'Already void.', 409);
    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({ where: { id: contractId }, data: { status: 'VOID' } });
      await tx.activity.create({ data: { leadId: c.booking.leadId, actorId: u.id, type: 'contract_void', body: reason, meta: { bookingId: c.bookingId, contractId } } });
      await this.audit.record({ actorId: u.id, action: 'contract.void', entity: 'contract', entityId: contractId, before: { status: c.status }, after: { reason }, ip }, tx);
    });
    // The provider envelope should be voided too once a real adapter exists.
    return this.forBooking(c.bookingId);
  }

  /** POST /webhooks/esign: signature, idempotency, then forward-only status changes. */
  async webhook(rawBody: Buffer | undefined, headers: Headers, body: unknown) {
    if (!this.esign.verifyWebhook(rawBody, headers)) throw new DomainError('BAD_SIGNATURE', 'Invalid webhook signature.', 401);
    const event = this.esign.parseWebhook(body, headers);
    if (!event) return { ignored: true };
    const out = await ingestOnce(this.prisma, `esign:${this.esign.name}`, event.eventId, body, (tx) => this.apply(tx, event));
    if (!out.duplicate && out.result.signedBookingId) await this.pipeline.evaluateConfirmation(out.result.signedBookingId);
    return out.duplicate ? { duplicate: true } : { processed: true };
  }

  private async apply(tx: Prisma.TransactionClient, e: ESignEvent) {
    const c = await tx.contract.findUnique({ where: { providerRef: e.providerRef }, include: { booking: true } });
    // Unknown envelope, or a stale event for a contract that's already final: nothing to do.
    if (!c || c.status === 'SIGNED' || c.status === 'VOID' || c.status === e.status) return { signedBookingId: null };
    await tx.contract.update({ where: { id: c.id }, data: { status: e.status, signedAt: e.status === 'SIGNED' ? new Date() : undefined } });
    const type = e.status === 'SIGNED' ? 'contract_signed' : e.status === 'VOID' ? 'contract_void' : 'contract_partially_signed';
    await tx.activity.create({ data: { leadId: c.booking.leadId, type, body: e.status === 'SIGNED' ? 'Contract signed' : e.status === 'VOID' ? 'Contract declined or voided' : 'Contract partly signed', meta: { bookingId: c.bookingId, contractId: c.id } } });
    await this.audit.record({ actorId: null, action: 'contract.status', entity: 'contract', entityId: c.id, before: { status: c.status }, after: { status: e.status } }, tx);
    // Fetching and storing the signed PDF (CON-3) waits for the storage vendor (T-200).
    return { signedBookingId: e.status === 'SIGNED' ? c.bookingId : null };
  }
}
