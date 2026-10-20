import { z } from 'zod';
import { CategorySlugSchema, CitySlugSchema, EventTypeSchema, LanguageSchema, TierSchema, RepresentationTypeSchema } from './catalogue';
import { IndianMobileSchema } from './enquiry';

/**
 * Admin catalogue inputs (srs ADM-1..5, T-140..145). Shared so the admin app's forms validate with
 * exactly what the API accepts. Money is entered in whole rupees and stored as paise.
 */

/**
 * PATCH variant of an object schema: every field optional and *without* its create default. In
 * Zod 4 `.partial()` keeps defaults, which would silently blank fields an edit didn't mention.
 */
export function patchOf<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return z.object(
    Object.fromEntries(Object.entries(schema.shape).map(([k, f]) => [k, (f instanceof z.ZodDefault ? (f.unwrap() as z.ZodType) : (f as z.ZodType)).optional()])) as {
      [K in keyof T]: z.ZodOptional<z.ZodType<z.output<T[K]>>>;
    },
  );
}

const Slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes').max(80);
const Rupees = z.number().int().positive().max(100_000_000);

export const CategoryInputSchema = z.object({
  slug: CategorySlugSchema,
  name: z.string().trim().min(2).max(60),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export const CategoryUpdateSchema = patchOf(CategoryInputSchema.omit({ slug: true }));

const FeeBandRupees = z
  .object({ minRupees: Rupees, maxRupees: Rupees })
  .refine((b) => b.maxRupees > b.minRupees, { path: ['maxRupees'], message: 'Max must be above min (a range, never one exact fee)' });

const TalentFields = z.object({
  slug: Slug.optional(),
  stageName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(140).default(''),
  bio: z.string().trim().max(4000).default(''),
  baseCity: CitySlugSchema,
  travelsTo: z.array(CitySlugSchema).max(20).default([]),
  travelsPanIndia: z.boolean().default(false),
  languages: z.array(LanguageSchema).max(12).default([]),
  eventTypes: z.array(EventTypeSchema).max(12).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  tier: TierSchema.default('STANDARD'),
  featured: z.boolean().default(false),
  /** TAL-3: let the talent edit their own blackout dates in the portal. */
  blackoutSelfEdit: z.boolean().default(false),
  representationType: RepresentationTypeSchema,
  /** null = "On request". */
  feeBand: FeeBandRupees.nullable().default(null),
  showreelUrl: z.url().nullable().default(null),
  riderSummary: z.string().trim().max(1000).nullable().default(null),
  pastEvents: z.array(z.object({ title: z.string().trim().min(2).max(120), city: z.string().trim().min(2).max(60), year: z.number().int().min(1990).max(2100) })).max(30).default([]),
  faqs: z.array(z.object({ q: z.string().trim().min(3).max(200), a: z.string().trim().min(3).max(1000) })).max(20).default([]),
  followers: z.array(z.object({ platform: z.enum(['instagram', 'youtube']), count: z.number().int().nonnegative() })).max(4).default([]),
  /** Category slugs; the first is the primary category. */
  categories: z.array(CategorySlugSchema).min(1).max(4),
});

export const TalentInputSchema = TalentFields;
export type TalentInput = z.infer<typeof TalentInputSchema>;
/** PATCH: any subset; omitted fields stay as they are. */
export const TalentUpdateSchema = patchOf(TalentFields);
export type TalentUpdate = z.infer<typeof TalentUpdateSchema>;

export const TalentStatusSchema = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']) });

export const AdminTalentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']).optional(),
  category: CategorySlugSchema.optional(),
  q: z.string().trim().max(80).optional(),
});
export type AdminTalentQuery = z.infer<typeof AdminTalentQuerySchema>;

/** T-142: register an already-stored image (presigned upload comes with the storage vendor). */
export const MediaInputSchema = z.object({
  key: z.string().trim().min(1).max(500),
  alt: z.string().trim().min(3).max(200),
  width: z.number().int().positive().max(10_000).optional(),
  height: z.number().int().positive().max(10_000).optional(),
  credit: z.string().trim().max(200).optional(),
  blurDataURL: z.string().startsWith('data:image/').max(2000).optional(),
});
export const MediaOrderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(20) });

export const RateCardInputSchema = z
  .object({
    eventType: EventTypeSchema.nullable().default(null),
    minimumRupees: Rupees,
    sellingRupees: Rupees,
    commissionBps: z.number().int().min(0).max(10_000),
    notes: z.string().trim().max(500).nullable().default(null),
  })
  .refine((r) => r.sellingRupees >= r.minimumRupees, { path: ['sellingRupees'], message: 'Selling rate can’t be below the minimum' });
export type RateCardInput = z.infer<typeof RateCardInputSchema>;

export const RepInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  agencyName: z.string().trim().max(120).nullable().default(null),
  phone: IndianMobileSchema,
  email: z.string().trim().toLowerCase().email().nullable().default(null),
});
export const RepUpdateSchema = patchOf(RepInputSchema);
export const RepVerificationSchema = z.object({ status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']), note: z.string().trim().max(500).optional() });

export const BlackoutInputSchema = z.object({
  date: z.iso.date(),
  note: z.string().trim().max(200).nullable().default(null),
});
