import type { Prisma } from '@repo/db';
import type { CategorySlug, CitySlug, EventType, Language } from '@repo/schemas';

/** What the public serializer needs loaded with each talent. */
export const PUBLIC_TALENT_INCLUDE = {
  categories: { include: { category: true } },
  media: { orderBy: { sortOrder: 'asc' } },
  reps: { include: { rep: { select: { verification: true } } } },
} satisfies Prisma.TalentInclude;

export type TalentWithPublic = Prisma.TalentGetPayload<{ include: typeof PUBLIC_TALENT_INCLUDE }>;

/**
 * Public talent DTO (trd §7, CAT-*). A whitelist: rate cards, user ids, timestamps and every other
 * internal field are simply never copied. Shape matches `PublicTalentSchema` (strict) so the web
 * app can switch from the mock API without UI changes. Money goes out as paise strings.
 */
export function toPublicTalent(t: TalentWithPublic) {
  const primary = t.categories.find((c) => c.isPrimary) ?? t.categories[0];
  return {
    id: t.id,
    slug: t.slug,
    name: t.stageName,
    categories: t.categories.map((c) => c.category.slug as CategorySlug),
    primaryCategory: (primary?.category.slug ?? 'creators') as CategorySlug,
    tagline: t.tagline ?? '',
    bio: t.bio ?? '',
    baseCity: t.baseCity as CitySlug,
    travelsTo: t.travelsTo as CitySlug[],
    travelsPanIndia: t.travelsPanIndia,
    languages: t.languages as Language[],
    eventTypes: t.eventTypes as EventType[],
    tier: t.tier,
    representation: t.representationType,
    // "Verified" = at least one linked representative passed verification (CAT-11).
    verified: t.reps.some((r) => r.rep.verification === 'VERIFIED'),
    featured: t.featured,
    feeBand: t.feeBandMinPaise != null && t.feeBandMaxPaise != null ? { minPaise: t.feeBandMinPaise.toString(), maxPaise: t.feeBandMaxPaise.toString() } : null,
    images: t.media.map((m) => ({
      src: m.key,
      alt: m.alt,
      width: m.width ?? 1200,
      height: m.height ?? 1500,
      ...(m.blurDataURL ? { blurDataURL: m.blurDataURL } : {}),
      ...(m.credit ? { credit: m.credit } : {}),
    })),
    showreelUrl: t.showreelUrl,
    pastEvents: t.pastEvents as { title: string; city: string; year: number }[],
    riderSummary: t.riderSummary,
    faqs: t.faqs as { q: string; a: string }[],
    tags: t.tags,
    followers: t.followers as { platform: 'instagram' | 'youtube'; count: number }[],
  };
}
