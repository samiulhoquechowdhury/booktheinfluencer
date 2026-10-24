'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Clock, Globe2, Instagram, Languages, MapPin, Share2, ShieldCheck, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicTalent } from '@repo/schemas';
import { RepresentationLabel } from '@repo/ui/representation-label';
import { cn } from '@repo/ui/lib/cn';
import { VerifiedBadge } from '@repo/ui/verified-badge';
import { ctaLabelForTier } from '@repo/utils';
import { categoryName, categorySingular, cityName } from '@/lib/reference';
import { MORPH_NAME } from '@/components/talent/talent-card';
import { TierTag } from '@/components/talent/tier-tag';
import { FavouriteButton } from '@/components/talent/favourite-button';
import { openBookingPanel } from './booking-dock';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const PLATFORM = { instagram: { icon: Instagram, label: 'Instagram' }, youtube: { icon: Youtube, label: 'YouTube' } } as const;

/** Profile hero: breadcrumb, photo (shared view-transition name the card morphs into), name, key facts and actions. */
export function ProfileHero({ talent }: { talent: PublicTalent }) {
  const cover = talent.images[0]!;
  const travels = talent.travelsPanIndia ? 'Pan-India' : talent.travelsTo.length ? talent.travelsTo.map(cityName).join(', ') : 'Local only';

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: talent.name, text: talent.tagline, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <section className="pt-24 md:pt-28">
      <div className="shell">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-muted">
            <li><Link href="/talent" className="hover:text-fg">Talent</Link></li>
            <li className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden />
              <Link href={`/talent/${talent.primaryCategory}`} className="hover:text-fg">{categoryName(talent.primaryCategory)}</Link>
            </li>
            <li className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden />
              <span aria-current="page" className="text-fg">{talent.name}</span>
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 md:grid-cols-12 md:gap-10 lg:gap-14">
          <div className="relative mx-auto w-full max-w-md md:col-span-5 md:max-w-none">
            <div className="relative aspect-4/5 overflow-hidden rounded-3xl bg-surface-2" style={{ viewTransitionName: MORPH_NAME }}>
              <Image src={cover.src} alt={cover.alt} fill priority placeholder={cover.blurDataURL ? 'blur' : 'empty'} blurDataURL={cover.blurDataURL} sizes="(min-width: 1440px) 520px, (min-width: 768px) 40vw, min(100vw, 448px)" className="object-cover" />
              <div className="absolute top-4 left-4 flex gap-1.5">
                <TierTag tier={talent.tier} featured={talent.featured} />
              </div>
            </div>
            {cover.credit && <p className="mt-2 text-xs text-fg-subtle">{cover.credit}</p>}
          </div>

          <div className="flex min-w-0 flex-col justify-center md:col-span-7">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-semibold text-fg-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-brand-gradient" />
              {talent.categories.map(categorySingular).join(' · ')}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.5rem,1.6rem+3.2vw,4.5rem)] leading-[1.02] font-extrabold tracking-tight wrap-break-word">{talent.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <VerifiedBadge verified={talent.verified} withLabel size="md" />
              <RepresentationLabel type={talent.representation} className="text-xs" />
            </div>
            <p className="mt-5 max-w-xl text-lg text-fg-muted md:text-xl">{talent.tagline}</p>

            <dl className={cn('mt-7 grid max-w-xl grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface', (3 + talent.followers.length) % 3 === 0 && 'sm:grid-cols-3')}>
              <Fact icon={MapPin} label="Based in" value={cityName(talent.baseCity)} />
              <Fact icon={Globe2} label="Travels" value={travels} />
              <Fact icon={Languages} label="Performs in" value={talent.languages.join(', ')} />
              {talent.followers.map((f) => (
                <Fact key={f.platform} icon={PLATFORM[f.platform].icon} label={PLATFORM[f.platform].label} value={`${compact.format(f.count)} followers`} />
              ))}
            </dl>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openBookingPanel}
                className="group flex h-12 items-center gap-2 rounded-full bg-brand-gradient px-6 font-semibold text-primary-fg shadow-[0_14px_34px_-14px_var(--glow-1)] transition-transform active:scale-[0.98]"
              >
                {ctaLabelForTier(talent.tier)}
                <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
              </button>
              <FavouriteButton talent={talent} size="lg" />
              <button type="button" onClick={() => void share()} aria-label={`Share ${talent.name}’s profile`} className="grid size-12 place-items-center rounded-full border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                <Share2 className="size-5" aria-hidden />
              </button>
            </div>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-success" aria-hidden /> Free to request</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-primary-text" aria-hidden /> Reply within 24 hours</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3 ring-1 ring-border">
      <dt className="flex items-center gap-1.5 text-xs text-fg-muted"><Icon className="size-3.5" aria-hidden /> {label}</dt>
      <dd className="mt-1 text-sm font-semibold wrap-break-word">{value}</dd>
    </div>
  );
}
