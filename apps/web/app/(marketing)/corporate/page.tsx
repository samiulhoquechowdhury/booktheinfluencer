import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarCheck, FileText, Layers, ReceiptIndianRupee, Users } from 'lucide-react';
import { PageBanner } from '@/components/content/page-banner';
import { Button } from '@repo/ui/button';
import { CtaBanner } from '@/components/content/cta-banner';
import { FeatureGrid } from '@/components/content/feature-grid';
import { PageHero } from '@/components/content/page-hero';
import { publicApi } from '@/lib/api/server';
import { categorySingular } from '@/lib/reference';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Corporate & planner bookings',
  description: 'Talent for annual days, conferences, launches and award nights, with GST-ready paperwork, one point of contact and verified representation.',
  alternates: { canonical: '/corporate' },
};

const EVENTS = ['Annual days', 'Conferences', 'Product launches', 'Award nights', 'Town halls', 'College fests', 'Brand campaigns'];

const POINTS = [
  { icon: Layers, title: 'One brief, several options', body: 'Tell us the room and the budget. We shortlist artists who fit, with honest availability.' },
  { icon: FileText, title: 'GST-ready paperwork', body: 'Itemised quotes, proforma, contracts and receipts your finance team will accept.' },
  { icon: Users, title: 'A manager who has done this', body: 'Run of show, rider, travel and the day itself, coordinated by one person.' },
  { icon: Building2, title: 'Built for repeat events', body: 'Annual days, town halls and sales kick-offs. Your history and preferences carry over.' },
];

export default async function CorporatePage() {
  const featured = await publicApi.talents.featured();
  const anchor = featured.find((t) => t.slug === 'kopil-bora') ?? featured[0];
  return (
    <>
      <PageHero
        banner={
          <PageBanner
            title="Talent for every stage you run"
            cta={{ href: '/enquire', label: 'Plan with an expert' }}
            tint="#ece9fb"
            disc="#7c5cf0"
            accent="#d9d1fb"
            image={anchor?.images[0]}
            chips={[
              { icon: CalendarCheck, label: 'Annual day · 600 guests' },
              { icon: ReceiptIndianRupee, label: 'GST invoice ready' },
            ]}
          />
        }
        crumbs={[{ href: '/', label: 'Home' }, { href: '/corporate', label: 'Corporate' }]}
        label="For corporates & planners"
        title={<>Your stage, <span className="font-serif font-normal italic">sorted.</span></>}
        lead="From a 300-person offsite to a 5,000-seat campus fest, we source, verify, contract and coordinate the talent."
      >
        <Button asChild size="lg">
          <Link href="/enquire">
            Plan with an expert <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Talk to sales</Link>
        </Button>
      </PageHero>

      {/* Event types */}
      <div className="shell">
        <ul className="flex max-w-3xl flex-wrap gap-2" aria-label="Events we book for">
          {EVENTS.map((e) => (
            <li key={e} className="rounded-full border border-border bg-bg-elevated px-3.5 py-1.5 text-sm text-fg-muted">
              {e}
            </li>
          ))}
        </ul>
      </div>

      {/* Why teams come back */}
      <section aria-labelledby="why-title" className="py-20 md:py-28">
        <div className="shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">Why teams come back</p>
            <h2 id="why-title" className="font-display text-h1 font-extrabold tracking-tight md:text-[3rem] md:leading-[1.05]">
              Less chasing, <span className="font-serif font-normal italic">more show.</span>
            </h2>
          </div>
          <FeatureGrid items={POINTS} className="mt-12 md:mt-14" />
        </div>
      </section>

      {/* Faces on the roster */}
      {featured.length > 0 && (
        <section aria-labelledby="roster-title" className="border-t border-border py-20 md:py-28">
          <div className="shell">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow mb-4">On the roster</p>
                <h2 id="roster-title" className="font-display text-h1 font-extrabold tracking-tight">Faces your audience knows</h2>
              </div>
              <Link href="/talent" className="group inline-flex items-center gap-2 text-sm font-semibold text-primary-text">
                See all talent
                <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {featured.slice(0, 6).map((t) => (
                <li key={t.slug}>
                  <Link href={`/t/${t.slug}`} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
                      <Image src={t.images[0]!.src} alt={t.images[0]!.alt} fill sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw" className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105" />
                    </span>
                    <span className="mt-3 block truncate text-sm font-semibold">{t.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{categorySingular(t.primaryCategory)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="shell pb-24 md:pb-32">
        <CtaBanner
          title="Planning your next event?"
          body="Share the date, city and audience. Your manager comes back with options within a day."
          primary={{ href: '/enquire', label: 'Plan with an expert', shortLabel: 'Plan event' }}
          secondary={{ href: '/contact', label: 'Talk to sales', shortLabel: 'Talk to sales' }}
        />
      </div>
    </>
  );
}
