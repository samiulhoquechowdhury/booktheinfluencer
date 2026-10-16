import { CategoryWall } from '@/components/home/category-wall';
import { CorporateBand } from '@/components/home/corporate-band';
import { FaqSection } from '@/components/home/faq-section';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { TrustNumbers } from '@/components/home/trust-numbers';
import { publicApi } from '@/lib/api/server';
import { CATEGORIES, CITIES } from '@/lib/reference';
import { JsonLd, organizationLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, all] = await Promise.all([publicApi.talents.featured(), publicApi.talents.list({ pageSize: 48 })]);

  const wall = CATEGORIES.flatMap((c) => {
    const inCat = all.items.filter((t) => t.categories.includes(c.slug));
    if (!inCat.length) return [];
    return [{ slug: c.slug, label: c.slug === 'speakers' ? 'Anchors' : c.slug === 'actors' ? 'Actors' : c.name, count: inCat.length, image: inCat[0]!.images[0]! }];
  });
  const corporateImages = all.items.filter((t) => t.primaryCategory === 'speakers' || t.primaryCategory === 'comedians').flatMap((t) => t.images.slice(1, 2)).slice(0, 3);

  return (
    <>
      <JsonLd data={organizationLd()} />
      <Hero mosaic={featured} />
      <CategoryWall items={wall} />
      <HowItWorks />
      <FeaturedCarousel talents={featured} />
      <TrustNumbers talentCount={all.total} cityCount={CITIES.length} />
      <CorporateBand images={corporateImages} />
      <FaqSection />
    </>
  );
}
