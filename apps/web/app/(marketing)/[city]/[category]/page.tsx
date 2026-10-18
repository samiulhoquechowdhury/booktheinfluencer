import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CATEGORY_SLUGS, CITY_SLUGS, CategorySlugSchema, CitySlugSchema } from '@repo/schemas';
import { ListingHero } from '@/components/listing/listing-hero';
import { ListingView } from '@/components/listing/listing-view';
import { publicApi } from '@/lib/api/server';
import { CATEGORIES, CITIES, categoryBySlug, cityBySlug } from '@/lib/reference';
import { JsonLd, breadcrumbLd } from '@/lib/seo/json-ld';

/** SEO landing (CAT-10): /guwahati/singers etc. Fully static, ISR hourly. */
export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => CITY_SLUGS.flatMap((city) => CATEGORY_SLUGS.map((category) => ({ city, category })));

type Props = { params: Promise<{ city: string; category: string }> };

const resolve = async (params: Props['params']) => {
  const p = await params;
  const city = CitySlugSchema.safeParse(p.city);
  const cat = CategorySlugSchema.safeParse(p.category);
  if (!city.success || !cat.success) return null;
  return { city: cityBySlug(city.data)!, category: categoryBySlug(cat.data)! };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return {};
  const title = `${r.category.name} in ${r.city.name} for weddings, corporate & college events`;
  const description = `Book verified ${r.category.name.toLowerCase()} in ${r.city.name}, ${r.city.state}. Indicative fee bands, verified representation, contracts and secure payments.`;
  return { title, description, alternates: { canonical: `/${r.city.slug}/${r.category.slug}` }, openGraph: { title, description } };
}

export default async function CityCategoryPage({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  const { city, category } = r;
  const initial = await publicApi.talents.list({ category: category.slug, city: city.slug, pageSize: 12 });
  const crumbs = [
    { href: '/', label: 'Home' },
    { href: `/talent/${category.slug}`, label: category.name },
    { href: `/${city.slug}/${category.slug}`, label: city.name },
  ];
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs.map((x) => ({ name: x.label, path: x.href })))} />
      <ListingHero
        category={category.slug}
        eyebrow={`${city.name}, ${city.state}`}
        title={
          <>
            {category.name} <span className="font-serif font-normal normal-case italic">in</span> {city.name}
          </>
        }
        description={`${category.name} based in or travelling to ${city.name}, for weddings, annual days, college fests and launches. Your manager confirms availability and sends one itemised quote.`}
        crumbs={crumbs}
      />
      <Suspense>
        <ListingView initial={initial} locked={{ category: category.slug, city: city.slug }} />
      </Suspense>
      <section aria-labelledby="more-title" className="shell border-t border-border py-16">
        <h2 id="more-title" className="eyebrow mb-6">Explore more</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <ul className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
              <li key={c.slug}>
                <Link href={`/${city.slug}/${c.slug}`} className="inline-block rounded-full border border-border px-3 py-1.5 text-sm text-fg-muted hover:text-fg">
                  {c.name} in {city.name}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-2">
            {CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}/${category.slug}`} className="inline-block rounded-full border border-border px-3 py-1.5 text-sm text-fg-muted hover:text-fg">
                  {category.name} in {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
