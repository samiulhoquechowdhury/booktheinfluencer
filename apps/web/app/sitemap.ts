import type { MetadataRoute } from 'next';
import { CATEGORY_SLUGS, CITY_SLUGS } from '@repo/schemas';
import { publicApi } from '@/lib/api/server';
import { BRAND } from '@/lib/brand';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const url = (p: string) => `${BRAND.url}${p}`;
  const talents = await publicApi.talents.list({ pageSize: 48 });
  return [
    ...['/', '/talent', '/how-it-works', '/corporate', '/about', '/faq', '/contact'].map((p) => ({ url: url(p), lastModified: now, priority: p === '/' ? 1 : 0.7 })),
    ...CATEGORY_SLUGS.map((c) => ({ url: url(`/talent/${c}`), lastModified: now, priority: 0.8 })),
    ...CITY_SLUGS.flatMap((city) => CATEGORY_SLUGS.map((c) => ({ url: url(`/${city}/${c}`), lastModified: now, priority: 0.6 }))),
    ...talents.items.map((t) => ({ url: url(`/t/${t.slug}`), lastModified: now, priority: 0.8 })),
    ...['terms', 'privacy', 'cancellation'].map((d) => ({ url: url(`/legal/${d}`), lastModified: now, priority: 0.2 })),
  ];
}
