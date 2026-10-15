import { z } from 'zod';
import { ImageSchema, IsoDateSchema, PageSchema, PaiseSchema } from './common';

export const CATEGORY_SLUGS = ['singers', 'djs', 'comedians', 'speakers', 'creators'] as const;
export const CategorySlugSchema = z.enum(CATEGORY_SLUGS);
export type CategorySlug = z.infer<typeof CategorySlugSchema>;

export const CategorySchema = z.object({
  slug: CategorySlugSchema,
  name: z.string(),
  singular: z.string(),
  description: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CITY_SLUGS = [
  'guwahati',
  'shillong',
  'kolkata',
  'delhi',
  'mumbai',
  'bengaluru',
  'hyderabad',
  'pune',
] as const;
export const CitySlugSchema = z.enum(CITY_SLUGS);
export type CitySlug = z.infer<typeof CitySlugSchema>;

export const CitySchema = z.object({ slug: CitySlugSchema, name: z.string(), state: z.string() });
export type City = z.infer<typeof CitySchema>;

export const REPRESENTATION_TYPES = [
  'TALENT_MANAGED',
  'AGENCY_MANAGED',
  'PLATFORM_COORDINATED',
] as const;
export const RepresentationTypeSchema = z.enum(REPRESENTATION_TYPES);
export type RepresentationType = z.infer<typeof RepresentationTypeSchema>;

export const TierSchema = z.enum(['STANDARD', 'PREMIUM']);
export type Tier = z.infer<typeof TierSchema>;

export const EVENT_TYPES = [
  'CORPORATE',
  'WEDDING',
  'COLLEGE_FEST',
  'PRODUCT_LAUNCH',
  'AWARD_NIGHT',
  'PRIVATE_PARTY',
  'CONFERENCE',
  'CLUB_NIGHT',
  'BRAND_CAMPAIGN',
  'CONCERT',
] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

export const LANGUAGES = [
  'Hindi',
  'English',
  'Assamese',
  'Bengali',
  'Khasi',
  'Nepali',
  'Marathi',
  'Kannada',
  'Telugu',
  'Tamil',
  'Punjabi',
] as const;
export const LanguageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof LanguageSchema>;

/** Public indicative range. `null` on the talent means "On request". */
export const FeeBandSchema = z
  .object({ minPaise: PaiseSchema, maxPaise: PaiseSchema })
  .refine((b) => b.maxPaise > b.minPaise, 'Fee band max must exceed min (never a single fee)');
export type FeeBand = z.infer<typeof FeeBandSchema>;

/**
 * Public talent DTO. Strict: any internal field (rate card, payout, margin) makes parsing fail,
 * so leaks surface in tests instead of the UI.
 */
export const PublicTalentSchema = z.strictObject({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  categories: z.array(CategorySlugSchema).min(1),
  primaryCategory: CategorySlugSchema,
  tagline: z.string(),
  bio: z.string(),
  baseCity: CitySlugSchema,
  travelsTo: z.array(CitySlugSchema),
  travelsPanIndia: z.boolean(),
  languages: z.array(LanguageSchema).min(1),
  eventTypes: z.array(EventTypeSchema).min(1),
  tier: TierSchema,
  representation: RepresentationTypeSchema,
  verified: z.boolean(),
  featured: z.boolean(),
  feeBand: FeeBandSchema.nullable(),
  images: z.array(ImageSchema).min(4).max(6),
  showreelUrl: z.string().url().nullable(),
  pastEvents: z.array(z.object({ title: z.string(), city: z.string(), year: z.number().int() })),
  riderSummary: z.string().nullable(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })),
  tags: z.array(z.string()),
});
export type PublicTalent = z.infer<typeof PublicTalentSchema>;

export const SORTS = ['relevance', 'fee_asc', 'fee_desc'] as const;
export const TalentSortSchema = z.enum(SORTS);
export type TalentSort = z.infer<typeof TalentSortSchema>;

export const BUDGET_BANDS = ['under_1l', '1l_3l', '3l_10l', 'above_10l'] as const;
export const BudgetBandSchema = z.enum(BUDGET_BANDS);
export type BudgetBand = z.infer<typeof BudgetBandSchema>;

export const TalentQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: CategorySlugSchema.optional(),
  city: CitySlugSchema.optional(),
  date: IsoDateSchema.optional(),
  eventType: EventTypeSchema.optional(),
  language: LanguageSchema.optional(),
  budget: BudgetBandSchema.optional(),
  verified: z.boolean().optional(),
  sort: TalentSortSchema.default('relevance'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(48).default(12),
});
export type TalentQuery = z.input<typeof TalentQuerySchema>;
export type TalentQueryParsed = z.infer<typeof TalentQuerySchema>;

export const TalentPageSchema = PageSchema(PublicTalentSchema);
export type TalentPage = z.infer<typeof TalentPageSchema>;
