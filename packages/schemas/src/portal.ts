import { z } from 'zod';
import { IsoDateSchema, IsoDateTimeSchema, PaiseSchema } from './common';
import { AvailabilityStatusSchema, BookingEventSchema, ContractStatusSchema } from './booking';

/** Talent-facing booking DTO (TAL-1/2). Strict — payout only; never selling price or margin. */
export const TalentBookingSchema = z.strictObject({
  ref: z.string(),
  event: BookingEventSchema,
  availability: AvailabilityStatusSchema,
  contract: ContractStatusSchema,
  payoutPaise: PaiseSchema.nullable(),
  reportingTime: z.string().nullable(),
  pointOfContact: z.string(),
});
export type TalentBooking = z.infer<typeof TalentBookingSchema>;

export const PayoutStatusSchema = z.enum(['SCHEDULED', 'PENDING', 'PAID']);
export const TalentPayoutSchema = z.strictObject({
  id: z.string(),
  bookingRef: z.string(),
  eventTitle: z.string(),
  eventDate: IsoDateSchema,
  amountPaise: PaiseSchema,
  status: PayoutStatusSchema,
  paidAt: IsoDateTimeSchema.nullable(),
  reference: z.string().nullable(),
});
export type TalentPayout = z.infer<typeof TalentPayoutSchema>;

export const BlackoutSchema = z.strictObject({
  date: IsoDateSchema,
  reason: z.string().max(80).nullable(),
});
export type Blackout = z.infer<typeof BlackoutSchema>;

export const PortalProfileSchema = z.strictObject({
  talentSlug: z.string(),
  name: z.string(),
  blackoutEditable: z.boolean(),
});
export type PortalProfile = z.infer<typeof PortalProfileSchema>;
