'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { MapPin } from 'lucide-react';
import type { PublicTalent } from '@repo/schemas';
import { FeeBand } from '@repo/ui/fee-band';
import { RepresentationLabel } from '@repo/ui/representation-label';
import { VerifiedBadge } from '@repo/ui/verified-badge';
import { cn } from '@repo/ui/lib/cn';
import { categorySingular, cityName } from '@/lib/reference';
import { TiltCard, usePageTransition } from '@/lib/motion';
import { FavouriteButton } from './favourite-button';
import { TierTag } from './tier-tag';

export const MORPH_NAME = 'talent-hero';

/**
 * TalentCard (design.md §4): photo 4:5, name, categories, base city, languages, fee band,
 * verified badge, representation label, favourite heart. Clicking morphs the image into the
 * profile hero via the View Transitions API.
 */
export function TalentCard({
  talent,
  tilt = true,
  priority = false,
  sizes = '(min-width: 1440px) 300px, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw',
  className,
}: {
  talent: PublicTalent;
  tilt?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const { navigateWithMorph } = usePageTransition();
  const href = `/t/${talent.slug}`;
  const cover = talent.images[0]!;

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const img = e.currentTarget.querySelector<HTMLElement>('[data-morph]');
    document.querySelectorAll<HTMLElement>('[data-morph]').forEach((el) => (el.style.viewTransitionName = ''));
    if (img) img.style.viewTransitionName = MORPH_NAME;
    navigateWithMorph(href);
  };

  const body = (
    <article className={cn('group relative flex h-full flex-col', className)}>
      <Link href={href} onClick={onClick} data-cursor="View" className="relative block overflow-hidden rounded-xl bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
        <div data-morph className="duotone relative aspect-[4/5]">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes={sizes}
            priority={priority}
            placeholder={cover.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={cover.blurDataURL}
            className="object-cover grayscale-[15%] transition-transform duration-[900ms] ease-(--ease-out-expo) group-hover:scale-[1.06]"
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <span className="absolute top-3 right-15 left-3 flex flex-wrap gap-1.5">
          <TierTag tier={talent.tier} featured={talent.featured} />
        </span>
        <span className="absolute right-3 bottom-3 left-3 flex min-w-0 items-center gap-1 text-xs font-medium text-white/90">
          <MapPin className="size-3.5" aria-hidden />
          <span className="truncate">{cityName(talent.baseCity)}</span>
          {talent.travelsPanIndia && <span className="hidden shrink-0 text-white/60 sm:inline">· Pan-India</span>}
        </span>
        <span className="sr-only">View {talent.name}’s profile</span>
      </Link>
      <FavouriteButton talent={talent} className="absolute top-3 right-3 z-30" />
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-start gap-1.5 font-display text-lg leading-tight font-extrabold tracking-tight sm:items-center sm:text-xl">
            <Link href={href} onClick={onClick} className="hover:underline hover:decoration-1 hover:underline-offset-4" tabIndex={-1}>
              {talent.name}
            </Link>
            <VerifiedBadge verified={talent.verified} size="sm" />
          </h3>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-fg-muted">
          {talent.categories.map(categorySingular).join(' · ')} · {talent.languages.slice(0, 3).join(', ')}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <FeeBand band={talent.feeBand} size="sm" />
          <RepresentationLabel type={talent.representation} />
        </div>
      </div>
    </article>
  );

  return tilt ? <TiltCard className="h-full rounded-xl" max={5}>{body}</TiltCard> : body;
}
