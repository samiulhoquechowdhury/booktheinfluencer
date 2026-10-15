import { z } from 'zod';
import { BpsSchema, ImageSchema, IsoDateSchema, IsoDateTimeSchema, PaiseSchema } from './common';
import { CategorySlugSchema, CitySlugSchema, EventTypeSchema } from './catalogue';

export const AVAILABILITY_STATUSES = [
  'NOT_CHECKED',
  'AWAITING_MANAGER',
  'HOLD_REQUESTED',
  'AVAILABLE',
  'TENTATIVE',
  'UNAVAILABLE',
  'CONFIRMED',
] as const;
export const AvailabilityStatusSchema = z.enum(AVAILABILITY_STATUSES);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const LEAD_STAGES = [
  'NEW',
  'CONTACTED',
  'REQUIREMENT_RECEIVED',
  'SHORTLISTED',
  'AVAILABILITY_CHECK',
  'QUOTE_SENT',
  'NEGOTIATION',
  'ADVANCE_PENDING',
  'CONFIRMED',
  'EVENT_COMPLETED',
  'SETTLEMENT',
  'CLOSED',
  'LOST',
  'CANCELLED',
] as const;
export const LeadStageSchema = z.enum(LEAD_STAGES);
export type LeadStage = z.infer<typeof LeadStageSchema>;

export const LINE_ITEM_TYPES = [
  'TALENT_FEE',
  'TRAVEL',
  'ACCOMMODATION',
  'LOCAL_TRANSPORT',
  'SECURITY',
  'PRODUCTION',
  'SERVICE_FEE',
  'OTHER',
] as const;
export const LineItemTypeSchema = z.enum(LINE_ITEM_TYPES);
export type LineItemType = z.infer<typeof LineItemTypeSchema>;

export const QuoteStatusSchema = z.enum([
  'SENT',
  'ACCEPTED',
  'CHANGES_REQUESTED',
  'EXPIRED',
  'SUPERSEDED',
]);
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

export const MilestoneStatusSchema = z.enum(['UPCOMING', 'DUE', 'PAID', 'OVERDUE']);
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;

export const ContractStatusSchema = z.enum(['NOT_SENT', 'SENT', 'SIGNED']);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

/** Customer-facing line: selling amount only. No cost, payout or margin. */
export const CustomerLineItemSchema = z.strictObject({
  id: z.string(),
  type: LineItemTypeSchema,
  description: z.string(),
  amountPaise: PaiseSchema,
});
export type CustomerLineItem = z.infer<typeof CustomerLineItemSchema>;

export const QuoteMilestoneSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  percentBps: BpsSchema,
  amountPaise: PaiseSchema,
  dueDate: IsoDateSchema,
});
export type QuoteMilestone = z.infer<typeof QuoteMilestoneSchema>;

export const CustomerQuoteSchema = z.strictObject({
  id: z.string(),
  version: z.number().int().positive(),
  status: QuoteStatusSchema,
  issuedAt: IsoDateTimeSchema,
  validUntil: IsoDateTimeSchema,
  lineItems: z.array(CustomerLineItemSchema).min(1),
  subtotalPaise: PaiseSchema,
  gstBps: BpsSchema,
  taxPaise: PaiseSchema,
  totalPaise: PaiseSchema,
  milestones: z.array(QuoteMilestoneSchema).min(1),
  inclusions: z.array(z.string()),
  notes: z.string().nullable(),
  acceptedAt: IsoDateTimeSchema.nullable(),
  changeRequest: z.string().nullable(),
});
export type CustomerQuote = z.infer<typeof CustomerQuoteSchema>;

export const CustomerMilestoneSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  amountPaise: PaiseSchema,
  dueDate: IsoDateSchema,
  status: MilestoneStatusSchema,
  paidAt: IsoDateTimeSchema.nullable(),
  receiptNo: z.string().nullable(),
});
export type CustomerMilestone = z.infer<typeof CustomerMilestoneSchema>;

export const DocumentKindSchema = z.enum(['QUOTE_PDF', 'CONTRACT', 'RECEIPT', 'INVOICE', 'RIDER']);
export const BookingDocumentSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  kind: DocumentKindSchema,
  uploadedAt: IsoDateTimeSchema,
  sizeKb: z.number().int().positive(),
});
export type BookingDocument = z.infer<typeof BookingDocumentSchema>;

export const BookingTalentRefSchema = z.strictObject({
  slug: z.string(),
  name: z.string(),
  primaryCategory: CategorySlugSchema,
  image: ImageSchema,
});
export type BookingTalentRef = z.infer<typeof BookingTalentRefSchema>;

export const BookingEventSchema = z.strictObject({
  type: EventTypeSchema,
  title: z.string(),
  date: IsoDateSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  city: CitySlugSchema,
  venue: z.string(),
  audienceSize: z.number().int().positive(),
  durationMins: z.number().int().positive(),
});
export type BookingEvent = z.infer<typeof BookingEventSchema>;

export const TimelineEntrySchema = z.strictObject({
  at: IsoDateTimeSchema,
  label: z.string(),
});

/** Customer booking DTO (CUS-2). Strict — no payout, margin or rate card fields. */
export const CustomerBookingSchema = z.strictObject({
  ref: z.string(),
  leadRef: z.string(),
  stage: LeadStageSchema,
  availability: AvailabilityStatusSchema,
  talent: BookingTalentRefSchema,
  event: BookingEventSchema,
  createdAt: IsoDateTimeSchema,
  quotes: z.array(CustomerQuoteSchema),
  contract: z.strictObject({
    status: ContractStatusSchema,
    sentAt: IsoDateTimeSchema.nullable(),
    signedAt: IsoDateTimeSchema.nullable(),
  }),
  advancePaid: z.boolean(),
  milestones: z.array(CustomerMilestoneSchema),
  documents: z.array(BookingDocumentSchema),
  activity: z.array(TimelineEntrySchema),
  notes: z.string().nullable(),
  manager: z.strictObject({ name: z.string(), phone: z.string(), whatsapp: z.string() }),
});
export type CustomerBooking = z.infer<typeof CustomerBookingSchema>;

export const CustomerBookingSummarySchema = CustomerBookingSchema.pick({
  ref: true,
  stage: true,
  availability: true,
  talent: true,
  event: true,
  createdAt: true,
});
export type CustomerBookingSummary = z.infer<typeof CustomerBookingSummarySchema>;

export const QuoteDecisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({
    action: z.literal('request_changes'),
    message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(1000),
  }),
]);
export type QuoteDecision = z.infer<typeof QuoteDecisionSchema>;

/** A brief submitted without a specific talent — our team sources options. */
export const CustomerBriefSchema = z.strictObject({
  ref: z.string(),
  event: BookingEventSchema,
  createdAt: IsoDateTimeSchema,
});
export type CustomerBrief = z.infer<typeof CustomerBriefSchema>;

export const CustomerDashboardSchema = z.object({
  bookings: z.array(CustomerBookingSummarySchema),
  briefs: z.array(CustomerBriefSchema),
});
export type CustomerDashboard = z.infer<typeof CustomerDashboardSchema>;

export const PayIntentSchema = z.object({
  milestoneId: z.string(),
  amountPaise: PaiseSchema,
  /** Real gateway link later; mock returns null and never changes payment state client-side. */
  checkoutUrl: z.string().url().nullable(),
  message: z.string(),
});
export type PayIntent = z.infer<typeof PayIntentSchema>;
