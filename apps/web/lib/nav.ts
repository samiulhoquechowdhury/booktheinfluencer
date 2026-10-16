import 'server-only';
import { cache } from 'react';
import type { NavData } from '@/components/shell/nav-types';
import { publicApi } from '@/lib/api/server';
import { CATEGORIES, categorySingular, cityName } from '@/lib/reference';

const BLURBS: Record<string, string> = {
  singers: 'Live vocals for weddings & annual days',
  djs: 'Dance floors, launches & after-parties',
  comedians: 'Clean, bilingual stand-up',
  speakers: 'Keynotes, emcees & award-night hosts',
  creators: 'Campaigns, launches & campus buzz',
};

/** Header data from the public catalogue (static/ISR-safe — no cookies). */
export const getNavData = cache(async (): Promise<NavData> => {
  const all = await publicApi.talents.list({ pageSize: 48 });
  const featured = all.items.find((t) => t.featured && t.tier === 'PREMIUM' && t.primaryCategory === 'singers') ?? all.items.find((t) => t.featured) ?? null;
  return {
    total: all.total,
    categories: CATEGORIES.map((c) => {
      const inCat = all.items.filter((t) => t.categories.includes(c.slug));
      const cover = inCat[0]?.images[0];
      return {
        slug: c.slug,
        name: c.name,
        blurb: BLURBS[c.slug] ?? c.name,
        count: inCat.length,
        image: { src: cover?.src ?? '', blurDataURL: cover?.blurDataURL },
      };
    }),
    featured: featured
      ? {
          slug: featured.slug,
          name: featured.name,
          role: categorySingular(featured.primaryCategory),
          city: cityName(featured.baseCity),
          image: { src: featured.images[0]!.src, alt: featured.images[0]!.alt, blurDataURL: featured.images[0]!.blurDataURL },
        }
      : null,
  };
});
