import type { PublicTalent } from '@repo/schemas';
import { formatINRShort } from '@repo/utils';
import { BRAND } from '@/lib/brand';
import { categorySingular, cityName } from '@/lib/reference';

/** Renders JSON-LD safely (escapes `<` to avoid script injection). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export const organizationLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.name,
  url: BRAND.url,
  contactPoint: { '@type': 'ContactPoint', telephone: BRAND.supportPhone, contactType: 'customer service', areaServed: 'IN' },
});

/** Person + an indicative Offer range. Never a single price (rules.md §0.6). */
export const personLd = (t: PublicTalent) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: t.name,
  url: `${BRAND.url}/t/${t.slug}`,
  image: t.images[0]?.src,
  jobTitle: t.categories.map(categorySingular).join(', '),
  description: t.tagline,
  knowsLanguage: t.languages,
  homeLocation: { '@type': 'Place', name: `${cityName(t.baseCity)}, India` },
  ...(t.feeBand
    ? {
        makesOffer: {
          '@type': 'Offer',
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'INR',
            minPrice: Number(t.feeBand.minPaise / 100n),
            maxPrice: Number(t.feeBand.maxPaise / 100n),
            description: `Indicative ${formatINRShort(t.feeBand.minPaise)} – ${formatINRShort(t.feeBand.maxPaise)}; final quote confirmed with the representative`,
          },
        },
      }
    : {}),
  subjectOf: t.pastEvents.map((e) => ({
    '@type': 'Event',
    name: e.title,
    startDate: `${e.year}`,
    eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: e.city, address: { '@type': 'PostalAddress', addressLocality: e.city, addressCountry: 'IN' } },
    performer: { '@type': 'Person', name: t.name },
  })),
});

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${BRAND.url}${it.path}` })),
});
