'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Instagram, MapPin, Youtube } from 'lucide-react';
import type { PublicTalent } from '@repo/schemas';
import { VerifiedBadge } from '@repo/ui/verified-badge';
import { cn } from '@repo/ui/lib/cn';
import { categorySingular, cityName } from '@/lib/reference';
import { FavouriteButton } from './favourite-button';
import { TierTag } from './tier-tag';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const PLATFORM = {
  instagram: { icon: Instagram, label: 'Instagram' },
  youtube: { icon: Youtube, label: 'YouTube' },
} as const;

/**
 * Featured carousel card: framed portrait with category chip and tags, name + tagline, audience
 * stats per platform (when sourced) and a profile link. Static (no tilt) so it scrolls smoothly.
 */
export function FeaturedTalentCard({ talent, sizes }: { talent: PublicTalent; sizes: string }) {
  const href = `/t/${talent.slug}`;
  const cover = talent.images[0]!;
  return (
    <article className="group relative flex h-full flex-col rounded-3xl border border-border bg-bg-elevated p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-18px_rgb(0_0_0/0.25)] transition-[transform,border-color,box-shadow] duration-500 ease-(--ease-out-expo) will-change-transform hover:-translate-y-1.5 hover:border-border-strong hover:shadow-[0_2px_4px_rgb(0_0_0/0.04),0_28px_50px_-24px_rgb(0_0_0/0.4)]">
      {/* Portrait */}
      <Link href={href} className="relative block overflow-hidden rounded-[1.25rem] bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative aspect-[4/5]">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes={sizes}
            placeholder={cover.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={cover.blurDataURL}
            className="object-cover transition-transform duration-[900ms] ease-(--ease-out-expo) group-hover:scale-[1.05]"
          />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
        <span className="absolute top-3 right-14 left-3 flex flex-wrap gap-1.5">
          <TierTag tier={talent.tier} featured={talent.featured} />
        </span>
        <span className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-md">
          {talent.categories.map(categorySingular).join(' · ')}
        </span>
        <span className="sr-only">View {talent.name}’s profile</span>
      </Link>
      <FavouriteButton talent={talent} className="absolute top-5 right-5 z-10" />

      {/* Body */}
      <div className="flex flex-1 flex-col px-2.5 pt-4 pb-2">
        <h3 className="flex items-center gap-1.5 font-display text-xl leading-tight font-extrabold tracking-tight">
          <Link href={href} className="truncate hover:underline hover:decoration-1 hover:underline-offset-4" tabIndex={-1}>
            {talent.name}
          </Link>
          <VerifiedBadge verified={talent.verified} size="sm" />
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-fg-muted">{talent.tagline}</p>

        {/* Audience */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {talent.followers.length > 0 ? (
            talent.followers.slice(0, 2).map((f) => {
              const P = PLATFORM[f.platform];
              return (
                <div key={f.platform} className={cn("rounded-xl bg-surface px-3 py-2", talent.followers.length === 1 && "col-span-2")}>
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-[0.6875rem] text-fg-muted">
                    <P.icon className="size-3.5" aria-hidden />
                    {P.label}
                  </p>
                  <p className="tabular mt-0.5 font-display text-lg leading-none font-extrabold">{compact.format(f.count)}</p>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 rounded-xl bg-surface px-3 py-2">
              <p className="text-[0.6875rem] text-fg-muted">Performs in</p>
              <p className="mt-0.5 truncate text-sm font-semibold">{talent.languages.slice(0, 3).join(', ')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="flex min-w-0 items-center gap-1 text-xs text-fg-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {cityName(talent.baseCity)}
              {talent.travelsPanIndia && ' · Pan-India'}
            </span>
          </span>
          <Link
            href={href}
            aria-label={`View ${talent.name}’s profile`}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border transition-[background-color,border-color,color] duration-(--duration-slow) group-hover:border-transparent group-hover:bg-brand-gradient group-hover:text-primary-fg"
          >
            <ArrowUpRight className="size-4 transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover:rotate-45" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
