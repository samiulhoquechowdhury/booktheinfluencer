import { z } from 'zod';
import {
  BlackoutSchema,
  CustomerBookingSchema,
  CustomerDashboardSchema,
  EnquiryResultSchema,
  PayIntentSchema,
  PortalProfileSchema,
  PublicTalentSchema,
  SessionSchema,
  TalentBookingSchema,
  TalentPageSchema,
  TalentPayoutSchema,
  type ContactMessage,
  type Enquiry,
  type QuoteDecision,
  type SessionRole,
  type TalentQuery,
} from '@repo/schemas';
import type { Transport } from './transport';

/**
 * Typed API surface. Every response is parsed with the shared Zod schema — strict DTOs mean a
 * leaked internal field fails loudly instead of rendering.
 */
export function createApi(t: Transport) {
  const get = async <S extends z.ZodTypeAny>(schema: S, path: string, query?: Record<string, string | number | boolean | undefined>) =>
    schema.parse(await t({ method: 'GET', path, query })) as z.infer<S>;
  const send = async <S extends z.ZodTypeAny>(schema: S, method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) =>
    schema.parse(await t({ method, path, body })) as z.infer<S>;

  return {
    talents: {
      list: (q: TalentQuery = {}) => get(TalentPageSchema, '/talents', q as Record<string, string | number | boolean | undefined>),
      featured: () => get(z.array(PublicTalentSchema), '/talents/featured'),
      bySlug: (slug: string) => get(PublicTalentSchema, `/talents/${encodeURIComponent(slug)}`),
      similar: (slug: string) => get(z.array(PublicTalentSchema), `/talents/${encodeURIComponent(slug)}/similar`),
    },
    session: {
      get: () => get(SessionSchema, '/session'),
      set: (role: SessionRole) => send(SessionSchema, 'POST', '/session', { role }),
    },
    favourites: {
      list: () => get(z.array(PublicTalentSchema), '/me/favourites'),
      set: (slug: string, on: boolean) =>
        send(z.object({ slug: z.string(), favourite: z.boolean() }), on ? 'PUT' : 'DELETE', `/me/favourites/${encodeURIComponent(slug)}`),
    },
    enquiries: {
      requestOtp: (phone: string) =>
        send(z.object({ sent: z.boolean(), resendInSeconds: z.number(), devHint: z.string().optional() }), 'POST', '/otp', { phone }),
      submit: (input: Enquiry) => send(EnquiryResultSchema, 'POST', '/enquiries', input),
      contact: (input: ContactMessage) => send(z.object({ ref: z.string() }), 'POST', '/contact', input),
    },
    bookings: {
      dashboard: () => get(CustomerDashboardSchema, '/me/bookings'),
      byRef: (ref: string) => get(CustomerBookingSchema, `/me/bookings/${encodeURIComponent(ref)}`),
      decideQuote: (ref: string, quoteId: string, decision: QuoteDecision) =>
        send(CustomerBookingSchema, 'POST', `/me/bookings/${encodeURIComponent(ref)}/quotes/${encodeURIComponent(quoteId)}/decision`, decision),
      payIntent: (ref: string, milestoneId: string) =>
        send(PayIntentSchema, 'POST', `/me/bookings/${encodeURIComponent(ref)}/milestones/${encodeURIComponent(milestoneId)}/pay`),
    },
    portal: {
      profile: () => get(PortalProfileSchema, '/portal'),
      bookings: () => get(z.array(TalentBookingSchema), '/portal/bookings'),
      payouts: () => get(z.array(TalentPayoutSchema), '/portal/payouts'),
      blackouts: () => get(z.array(BlackoutSchema), '/portal/blackouts'),
      setBlackout: (date: string, on: boolean, reason?: string) =>
        send(z.array(BlackoutSchema), on ? 'PUT' : 'DELETE', `/portal/blackouts/${date}`, on ? { reason: reason ?? null } : undefined),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
