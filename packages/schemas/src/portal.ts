import { z } from 'zod';
import { IsoDateSchema, IsoDateTimeSchema, PaiseSchema } from './common';
import { AvailabilityStatusSchema, BookingEventSchema, ContractStatusSchema } from './booking';
import { CategorySlugSchema, CitySlugSchema, EventTypeSchema, LanguageSchema } from './catalogue';

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

// ── Talent self-onboarding ───────────────────────────────────────────────

/** Where a talent's own profile is: editing, waiting for staff, sent back, or on the site. */
export const OnboardingStatusSchema = z.enum(['NOT_STARTED', 'DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'LIVE', 'HIDDEN']);
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

export const ONBOARDING_MIN_PHOTOS = 4;
export const ONBOARDING_MAX_PHOTOS = 6;

/** Profile fields a talent fills in themselves. Drafts may be partial; submitting checks completeness. */
export const OnboardingProfileSchema = z.object({
  stageName: z.string().trim().min(2, 'Enter your stage name').max(80),
  categories: z.array(CategorySlugSchema).min(1, 'Pick at least one category').max(3),
  tagline: z.string().trim().max(120).default(''),
  bio: z.string().trim().max(2000).default(''),
  baseCity: CitySlugSchema,
  travelsPanIndia: z.boolean().default(true),
  travelsTo: z.array(CitySlugSchema).max(20).default([]),
  languages: z.array(LanguageSchema).max(10).default([]),
  eventTypes: z.array(EventTypeSchema).max(12).default([]),
  feeBand: z
    .object({ minRupees: z.number().int().min(1000), maxRupees: z.number().int().max(100_000_000) })
    .refine((b) => b.maxRupees > b.minRupees, { message: 'The upper fee must be higher than the lower one', path: ['maxRupees'] })
    .nullable()
    .default(null),
  showreelUrl: z.url('Enter a full link, e.g. https://youtube.com/…').nullable().default(null),
  riderSummary: z.string().trim().max(500).nullable().default(null),
});
export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;
export type OnboardingProfileInput = z.input<typeof OnboardingProfileSchema>;

export const OnboardingPhotoSchema = z.object({ id: z.string(), src: z.string(), width: z.number().nullable(), height: z.number().nullable() });
export type OnboardingPhoto = z.infer<typeof OnboardingPhotoSchema>;

export const OnboardingSchema = z.object({
  status: OnboardingStatusSchema,
  reviewNote: z.string().nullable(),
  submittedAt: IsoDateTimeSchema.nullable(),
  slug: z.string().nullable(),
  profile: OnboardingProfileSchema.nullable(),
  photos: z.array(OnboardingPhotoSchema),
  /** What still blocks submitting, in plain words (empty = ready). */
  gaps: z.array(z.string()),
});
export type Onboarding = z.infer<typeof OnboardingSchema>;

/** A photo resized in the browser: JPEG as a data URL, at most ~2.5 MB. */
export const OnboardingPhotoUploadSchema = z.object({
  dataUrl: z.string().startsWith('data:image/jpeg;base64,').max(3_500_000, 'That photo is too large. Use one under 2.5 MB.'),
  width: z.number().int().min(400, 'Use a photo at least 400 px wide').max(4000),
  height: z.number().int().min(400, 'Use a photo at least 400 px tall').max(4000),
});
export type OnboardingPhotoUpload = z.infer<typeof OnboardingPhotoUploadSchema>;
