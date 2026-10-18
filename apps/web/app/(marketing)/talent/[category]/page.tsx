import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CATEGORY_SLUGS, CategorySlugSchema } from '@repo/schemas';
import { ListingHero } from '@/components/listing/listing-hero';
import { ListingView } from '@/components/listing/listing-view';
import { publicApi } from '@/lib/api/server';
import { CITIES, categoryBySlug } from '@/lib/reference';
import { JsonLd, breadcrumbLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => CATEGORY_SLUGS.map((category) => ({ category }));

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = categoryBySlug((await params).category);
  if (!c) return {};
  return {
    title: `Book ${c.name.toLowerCase()} for events in India`,
    description: c.description,
    alternates: { canonical: `/talent/${c.slug}` },
    openGraph: { title: `${c.name} for events`, description: c.description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const parsed = CategorySlugSchema.safeParse((await params).category);
  if (!parsed.success) notFound();
  const c = categoryBySlug(parsed.data)!;
  const initial = await publicApi.talents.list({ category: c.slug, pageSize: 12 });
  const crumbs = [{ href: '/', label: 'Home' }, { href: '/talent', label: 'Talent' }, { href: `/talent/${c.slug}`, label: c.name }];
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs.map((x) => ({ name: x.label, path: x.href })))} />
      <ListingHero
        category={c.slug}
        eyebrow={`${initial.total} ${c.name.toLowerCase()}`}
        title={c.name}
        description={c.description}
        crumbs={crumbs}
        aside={
          <nav aria-label={`${c.name} by city`} className="flex flex-wrap gap-2 lg:justify-end">
            {CITIES.map((city) => (
              <Link key={city.slug} href={`/${city.slug}/${c.slug}`} className="rounded-full border border-border px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                {city.name}
              </Link>
            ))}
          </nav>
        }
      />
      <Suspense>
        <ListingView initial={initial} locked={{ category: c.slug }} />
      </Suspense>
    </>
  );
}
