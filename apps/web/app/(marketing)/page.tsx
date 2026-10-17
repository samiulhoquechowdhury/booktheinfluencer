import { CategoryWall } from '@/components/home/category-wall';
import { CorporateBand } from '@/components/home/corporate-band';
import { FaqSection } from '@/components/home/faq-section';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { TrustNumbers } from '@/components/home/trust-numbers';
import { publicApi } from '@/lib/api/server';
import { categoryCover } from '@/lib/category-covers';
import { CATEGORIES, CITIES } from '@/lib/reference';
import { JsonLd, organizationLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, all] = await Promise.all([publicApi.talents.featured(), publicApi.talents.list({ pageSize: 48 })]);

  // Same categories and covers as the navbar Talent menu.
  const wall = CATEGORIES.map((c) => {
    const inCat = all.items.filter((t) => t.categories.includes(c.slug));
    return { slug: c.slug, label: c.slug === 'speakers' ? 'Anchors' : c.slug === 'actors' ? 'Actors' : c.name, count: inCat.length, image: { ...categoryCover(c.slug, inCat), alt: '' } };
  });
  // Event scenes from talent galleries (deduped — several galleries share stock photos).
  const corporateImages = [...new Map(all.items.flatMap((t) => t.images.slice(1)).map((img) => [img.src, img])).values()].slice(0, 3);
  // Hero fan: Dimpu Baruah in the centre, four other featured faces around him.
  const centre = featured.find((t) => t.slug === 'dimpu-baruah');
  const others = featured.filter((t) => t !== centre).slice(0, centre ? 4 : 5);
  const fan = centre ? [...others.slice(0, 2), centre, ...others.slice(2)] : others;

  return (
    <>
      <JsonLd data={organizationLd()} />
      <Hero mosaic={fan} />
      <CategoryWall items={wall} />
      <HowItWorks />
      <FeaturedCarousel talents={featured} />
      <TrustNumbers talentCount={all.total} cityCount={CITIES.length} />
      <CorporateBand images={corporateImages} />
      <FaqSection />
    </>
  );
}
