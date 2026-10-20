import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { verifyHmac } from '../common/hmac';

/** What the payments module needs from a gateway (trd §8, ADR-6). One adapter per vendor. */
export interface PaymentGateway {
  readonly name: string;
  /** A hosted payment link for one milestone; `referenceId` comes back on the webhook. */
  createLink(input: { referenceId: string; amountPaise: bigint; description: string; customer: { name: string | null; phone: string | null; email: string | null }; expiresAt: Date }): Promise<{ linkId: string; url: string }>;
  verifyWebhook(rawBody: Buffer | undefined, headers: Record<string, string | string[] | undefined>): boolean;
  /** Normalised event, or null for event types we don't act on. */
  parseWebhook(body: unknown, headers: Record<string, string | string[] | undefined>): GatewayEvent | null;
}
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export type GatewayEvent = {
  eventId: string;
  type: 'paid' | 'failed';
  linkId: string | null;
  referenceId: string | null;
  paymentId: string;
  amountPaise: bigint;
  method: string;
};

const header = (h: Record<string, string | string[] | undefined>, k: string) => {
  const v = h[k];
  return Array.isArray(v) ? v[0] : v;
};

type FakeBody = {
  event?: string;
  payload?: {
    payment_link?: { entity?: { id?: string; reference_id?: string } };
    payment?: { entity?: { id?: string; amount?: number | string; method?: string } };
  };
};

/**
 * Development/test gateway: links point at the local site, and "payments" arrive as webhooks
 * signed with PAYMENT_WEBHOOK_SECRET (`x-gateway-signature`, hex HMAC-SHA256 of the raw body;
 * event id in `x-gateway-event-id`). The body is modelled on a payment-link-paid event. Env
 * validation forbids it in production.
 */
export class FakeGateway implements PaymentGateway {
  readonly name = 'fake';
  private readonly log = new Logger('FakeGateway');

  constructor(
    private readonly secret: string,
    private readonly webBaseUrl: string,
  ) {}

  async createLink(input: { referenceId: string; amountPaise: bigint }) {
    const linkId = `plink_fake_${randomBytes(8).toString('hex')}`;
    this.log.warn(`DEV payment link ${linkId} for ${input.amountPaise} paise`);
    return { linkId, url: `${this.webBaseUrl}/dev/checkout/${linkId}` };
  }

  verifyWebhook(rawBody: Buffer | undefined, headers: Record<string, string | string[] | undefined>) {
    return verifyHmac(this.secret, rawBody, header(headers, 'x-gateway-signature'));
  }

  parseWebhook(body: unknown, headers: Record<string, string | string[] | undefined>): GatewayEvent | null {
    const b = body as FakeBody;
    const eventId = header(headers, 'x-gateway-event-id');
    const pay = b.payload?.payment?.entity;
    if (!eventId || !pay?.id || pay.amount == null) return null;
    const type = b.event === 'payment_link.paid' || b.event === 'payment.captured' ? 'paid' : b.event === 'payment.failed' ? 'failed' : null;
    if (!type) return null;
    return {
      eventId,
      type,
      linkId: b.payload?.payment_link?.entity?.id ?? null,
      referenceId: b.payload?.payment_link?.entity?.reference_id ?? null,
      paymentId: pay.id,
      amountPaise: BigInt(pay.amount),
      method: pay.method ?? 'gateway',
    };
  }
}
