import { z } from 'zod';
import { CategorySlugSchema, CitySlugSchema } from './catalogue';
import { IsoDateSchema } from './common';
import { IndianMobileSchema } from './enquiry';

/** OPS-3 booking checklist (T-240), kept on Booking.opsChecklist. */
const Item = z.object({ status: z.enum(['NOT_NEEDED', 'PENDING', 'ARRANGED']), details: z.string().trim().max(500).nullable().default(null) });
const Pending = { status: 'PENDING' as const, details: null };

export const OpsChecklistSchema = z.object({
  travel: Item.default(Pending),
  hotel: Item.default(Pending),
  groundTransport: Item.default(Pending),
  rider: Item.default(Pending),
  /** HH:MM IST at the venue; shown to the talent. */
  reportingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM').nullable().default(null),
  /** On-site contact shown to the talent (never the customer's own number unless they agree). */
  pointOfContact: z.object({ name: z.string().trim().min(2).max(80), phone: IndianMobileSchema }).nullable().default(null),
  notes: z.string().trim().max(1000).nullable().default(null),
});
export type OpsChecklist = z.infer<typeof OpsChecklistSchema>;

/** Accounts: schedule / adjust / pay a talent payout (SET-1/2). */
export const PayoutScheduleSchema = z.object({ scheduledFor: IsoDateSchema });
export const PayoutAdjustSchema = z.object({ amountPaise: z.string().regex(/^\d{1,14}$/), note: z.string().trim().min(3).max(500) });
export const PayoutPaidSchema = z.object({ reference: z.string().trim().min(4).max(80), paidOn: IsoDateSchema });
export const PayoutQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum(['PENDING', 'SCHEDULED', 'PAID', 'ON_HOLD']).optional(),
});

/** ANA-1/2 filters. Dates are lead creation dates (IST calendar days). */
export const AnalyticsQuerySchema = z.object({
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  category: CategorySlugSchema.optional(),
  city: CitySlugSchema.optional(),
  ownerId: z.string().min(1).max(40).optional(),
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
