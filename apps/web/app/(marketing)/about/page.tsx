import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, FileCheck2, FileText, HeartHandshake, IndianRupee, ShieldCheck, UserRound } from 'lucide-react';
import { PageBanner } from '@/components/content/page-banner';
import { publicApi } from '@/lib/api/server';
import { Button } from '@repo/ui/button';
import { CtaBanner } from '@/components/content/cta-banner';
import { FeatureGrid } from '@/components/content/feature-grid';
import { PageHero } from '@/components/content/page-hero';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'About',
  description: 'A managed talent booking platform for India, with honest availability, transparent pricing and written terms for every booking.',
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  { icon: BadgeCheck, title: 'Request, don’t pretend', body: 'Nothing is booked on the spot. Every date is checked with the authorised representative first.' },
  { icon: IndianRupee, title: 'Prices in writing', body: 'Fees are confirmed in an itemised quote before you pay anything.' },
  { icon: ShieldCheck, title: 'Representation, labelled', body: 'Every profile says who manages the artist and whether we have verified it.' },
  { icon: FileText, title: 'Everyone sees their number', body: 'Customers see what they pay. Talent see what they are paid. No surprises.' },
  { icon: HeartHandshake, title: 'No false endorsement', body: 'We never imply an artist endorses us or is exclusively represented by us.' },
  { icon: UserRound, title: 'People first', body: 'Software makes our managers fast. It never replaces them on high-value bookings.' },
];

export default async function AboutPage() {
  const featured = await publicApi.talents.featured();
  const face = featured.find((t) => t.slug === 'nahid-afrin-ansari') ?? featured[0];
  return (
    <>
      <PageHero
        banner={
          <PageBanner
            title="Bookings you can trust, in writing"
            cta={{ href: '/talent', label: 'Browse talent' }}
            tint="#fdf0e2"
            disc="#f08a3c"
            accent="#fbd9b8"
            image={face?.images[0]}
            chips={[
              { icon: BadgeCheck, label: 'Verified representative' },
              { icon: FileCheck2, label: 'Itemised quote' },
            ]}
          />
        }
        crumbs={[{ href: '/', label: 'Home' }, { href: '/about', label: 'About' }]}
        label="About us"
        title={<>Built for the <span className="font-serif font-normal italic">people</span> behind the stage.</>}
        lead="Written, verified and well-run bookings for artists and the teams who hire them."
      >
        <Button asChild size="lg">
          <Link href="/talent">
            Browse talent <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/how-it-works">How it works</Link>
        </Button>
      </PageHero>

      {/* Why we exist */}
      <section aria-labelledby="why-title" className="py-16 md:py-24">
        <div className="shell grid gap-8 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <p className="eyebrow mb-4">Why we exist</p>
            <h2 id="why-title" className="font-display text-h1 font-extrabold tracking-tight">
              Booking talent should feel <span className="font-serif font-normal italic">safe.</span>
            </h2>
          </div>
          <div className="space-y-4 text-lg text-fg-muted md:col-span-7 md:pt-10">
            <p>Booking a singer, DJ, comedian or speaker in India still often means unclear prices, verbal promises and advance payments on trust.</p>
            <p>We put every step in writing: a verified representative, one itemised quote, a signed contract and a dedicated manager who sees it through.</p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-title" className="border-t border-border py-20 md:py-28">
        <div className="shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">What we stand for</p>
            <h2 id="principles-title" className="font-display text-h1 font-extrabold tracking-tight md:text-[3rem] md:leading-[1.05]">
              Six promises, <span className="font-serif font-normal italic">every booking.</span>
            </h2>
          </div>
          <FeatureGrid items={PRINCIPLES} className="mt-12 md:mt-14" />
        </div>
      </section>

      <div className="shell pb-24 md:pb-32">
        <CtaBanner
          title="Book with confidence."
          body="Send one brief and a dedicated manager handles the rest."
          primary={{ href: '/enquire', label: 'Start a brief' }}
          secondary={{ href: '/talent', label: 'Browse talent', shortLabel: 'Browse talent' }}
        />
      </div>
    </>
  );
}
