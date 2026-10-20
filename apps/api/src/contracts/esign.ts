import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { verifyHmac } from '../common/hmac';

/** E-sign provider (trd §8 ESignProvider, ADR-6). One adapter per vendor. */
export interface ESignProvider {
  readonly name: string;
  createEnvelope(input: { contractId: string; title: string; signers: { role: 'customer' | 'rep'; name: string; email: string | null; phone: string | null }[] }): Promise<{ providerRef: string }>;
  verifyWebhook(rawBody: Buffer | undefined, headers: Record<string, string | string[] | undefined>): boolean;
  parseWebhook(body: unknown, headers: Record<string, string | string[] | undefined>): ESignEvent | null;
}
export const ESIGN_PROVIDER = Symbol('ESIGN_PROVIDER');

export type ESignEvent = { eventId: string; providerRef: string; status: 'PARTIALLY_SIGNED' | 'SIGNED' | 'VOID' };

const header = (h: Record<string, string | string[] | undefined>, k: string) => {
  const v = h[k];
  return Array.isArray(v) ? v[0] : v;
};

/**
 * Development/test provider: envelopes are only logged; status changes arrive as webhooks signed
 * with ESIGN_WEBHOOK_SECRET (`x-esign-signature`, event id in `x-esign-event-id`, body
 * `{ envelopeId, status: "partially_signed" | "completed" | "voided" }`). Forbidden in production.
 */
export class FakeESign implements ESignProvider {
  readonly name = 'fake';
  private readonly log = new Logger('FakeESign');

  constructor(private readonly secret: string) {}

  async createEnvelope(input: { contractId: string; signers: unknown[] }) {
    const providerRef = `env_fake_${randomBytes(8).toString('hex')}`;
    this.log.warn(`DEV e-sign envelope ${providerRef} for ${input.signers.length} signer(s)`);
    return { providerRef };
  }

  verifyWebhook(rawBody: Buffer | undefined, headers: Record<string, string | string[] | undefined>) {
    return verifyHmac(this.secret, rawBody, header(headers, 'x-esign-signature'));
  }

  parseWebhook(body: unknown, headers: Record<string, string | string[] | undefined>): ESignEvent | null {
    const b = body as { envelopeId?: string; status?: string };
    const eventId = header(headers, 'x-esign-event-id');
    const status = b.status === 'completed' ? 'SIGNED' : b.status === 'partially_signed' ? 'PARTIALLY_SIGNED' : b.status === 'voided' ? 'VOID' : null;
    return eventId && b.envelopeId && status ? { eventId, providerRef: b.envelopeId, status } : null;
  }
}
