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
const InvitePreviewSchema = z.object({ name: z.string().nullable(), phone: z.string().nullable(), roles: z.array(z.string()), expiresAt: z.string(), method: z.enum(['password', 'otp']) });

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
      /** Real API: phone OTP sign-in (customers, and talent with an accepted invite). */
      requestCode: (phone: string) => send(z.object({ sent: z.boolean(), resendInSeconds: z.number(), devHint: z.string().optional() }), 'POST', '/session/otp', { phone }),
      verify: (phone: string, code: string, name?: string) => send(SessionSchema, 'POST', '/session/verify', { phone, code, ...(name ? { name } : {}) }),
      logout: () => send(SessionSchema, 'POST', '/session/logout'),
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
    invites: {
      /** Real API only: talent / rep invite links (AUTH-3). */
      preview: (token: string) => get(InvitePreviewSchema, `/invites/${encodeURIComponent(token)}`),
      sendCode: (token: string) => send(z.object({ resendInSeconds: z.number() }).passthrough(), 'POST', `/invites/${encodeURIComponent(token)}/code`),
      accept: (token: string, code: string, name?: string) => send(z.object({ nextStep: z.string() }).passthrough(), 'POST', `/invites/${encodeURIComponent(token)}/accept`, { code, ...(name ? { name } : {}) }),
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
