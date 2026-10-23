import { CategoryWall } from '@/components/home/category-wall';
import { CorporateBand } from '@/components/home/corporate-band';
import { FaqSection } from '@/components/home/faq-section';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { Hero } from '@/components/home/hero';
import { TopPicks } from '@/components/home/top-picks';
import { HowItWorks } from '@/components/home/how-it-works';
import { TrustNumbers } from '@/components/home/trust-numbers';
import { publicApi } from '@/lib/api/server';
import { BANNERS } from '@/lib/banners';
import { categoryCover } from '@/lib/category-covers';
import { CATEGORIES, CITIES } from '@/lib/reference';
import { JsonLd, organizationLd } from '@/lib/seo/json-ld';

/** trd §13: catalogue pages refresh every 5 minutes, and at once when the API pings /api/revalidate. */
export const revalidate = 300;


export default async function HomePage() {
  const [featured, all] = await Promise.all([publicApi.talents.featured(), publicApi.talents.list({ pageSize: 48 })]);

  // Same categories and covers as the navbar Talent menu.
  const wall = CATEGORIES.map((c) => {
    const inCat = all.items.filter((t) => t.categories.includes(c.slug));
    return { slug: c.slug, label: c.slug === 'speakers' ? 'Anchors' : c.slug === 'actors' ? 'Actors' : c.name, count: inCat.length, image: { ...categoryCover(c.slug, inCat), alt: '' } };
  });
  // Corporate panel collage: real roster portraits (actors first — the faces planners book for stages).
  const corporateImages = ['jatin-bora', 'nahid-afrin-ansari', 'kopil-bora'].flatMap((slug) => all.items.find((t) => t.slug === slug)?.images.slice(0, 1) ?? []);
  // Hero fan, left → right with Dimpu Baruah in the centre (faces with real photos). Missing slugs are
  // filled from the featured list, then the rest of the roster.
  const FAN_SLUGS = ['bikash-chetry', 'jatin-bora', 'kopil-bora', 'dimpu-baruah', 'nahid-afrin-ansari', 'nishita-goswami', 'zerifa-wahid'];
  const pool = [...featured, ...all.items].filter((t, i, a) => a.findIndex((x) => x.slug === t.slug) === i);
  const picked = FAN_SLUGS.flatMap((slug) => pool.filter((t) => t.slug === slug));
  const fan = [...picked, ...pool.filter((t) => !picked.includes(t))].slice(0, FAN_SLUGS.length);

  return (
    <>
      <JsonLd data={organizationLd()} />
      <Hero mosaic={fan} banners={BANNERS} />
      <FeaturedCarousel talents={featured} />
      <CategoryWall items={wall} />
      <TopPicks talents={all.items} />
      <HowItWorks />
      <TrustNumbers talentCount={all.total} cityCount={CITIES.length} />
      <CorporateBand images={corporateImages} />
      <FaqSection />
    </>
  );
}
