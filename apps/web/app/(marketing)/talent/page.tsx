import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListingHero } from '@/components/listing/listing-hero';
import { ListingView } from '@/components/listing/listing-view';
import { publicApi } from '@/lib/api/server';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Browse verified talent',
  description: 'Singers, DJs, comedians, speakers and creators across India. Filter by city, date, budget, language and event type.',
  alternates: { canonical: '/talent' },
};

export default async function TalentIndexPage() {
  const initial = await publicApi.talents.list({ pageSize: 12 });
  return (
    <>
      <ListingHero
        eyebrow={`${initial.total} verified acts · 8 cities`}
        title={<>All <span className="font-serif font-normal normal-case italic">talent</span></>}
        description="Every profile shows an indicative fee band and who represents the artist. Shortlist a few — your manager confirms availability and sends one itemised quote."
        crumbs={[{ href: '/', label: 'Home' }, { href: '/talent', label: 'Talent' }]}
      />
      <Suspense>
        <ListingView initial={initial} />
      </Suspense>
    </>
  );
}
