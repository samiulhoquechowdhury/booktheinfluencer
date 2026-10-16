'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { useRef } from 'react';
import { Globe2, Languages, MapPin } from 'lucide-react';
import type { PublicTalent } from '@repo/schemas';
import { RepresentationLabel } from '@repo/ui/representation-label';
import { VerifiedBadge } from '@repo/ui/verified-badge';
import { categorySingular, cityName } from '@/lib/reference';
import { SplitText } from '@/lib/motion';
import { MORPH_NAME } from '@/components/talent/talent-card';
import { TierTag } from '@/components/talent/tier-tag';
import { FavouriteButton } from '@/components/talent/favourite-button';

/** Profile hero. The image carries the shared view-transition name the card morphs into. */
export function ProfileHero({ talent }: { talent: PublicTalent }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const cover = talent.images[0]!;

  return (
    <section ref={ref} className="relative pt-24 md:pt-28">
      <div className="shell grid gap-8 md:grid-cols-12 md:gap-10 lg:gap-12">
        <div className="relative mx-auto w-full max-w-md md:col-span-5 md:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2" style={{ viewTransitionName: MORPH_NAME }}>
            <motion.div className="absolute inset-0" style={reduce ? undefined : { scale }}>
              <Image src={cover.src} alt={cover.alt} fill priority placeholder={cover.blurDataURL ? 'blur' : 'empty'} blurDataURL={cover.blurDataURL} sizes="(min-width: 1440px) 520px, (min-width: 768px) 40vw, min(100vw, 448px)" className="object-cover" />
            </motion.div>
            <div className="absolute top-4 left-4 flex gap-1.5">
              <TierTag tier={talent.tier} featured={talent.featured} />
            </div>
            <FavouriteButton talent={talent} size="lg" className="absolute top-4 right-4" />
          </div>
          {cover.credit && <p className="mt-2 text-xs text-fg-subtle">{cover.credit}</p>}
        </div>
        <div className="flex min-w-0 flex-col justify-end md:col-span-7 lg:pb-6">
          <p className="eyebrow mb-4">{talent.categories.map(categorySingular).join(' · ')}</p>
          <SplitText as="h1" by="char" trigger="mount" className="font-display text-[clamp(2.75rem,0.5rem+7vw,8.5rem)] leading-[0.88] font-black tracking-[-0.045em] break-words uppercase" lines={talent.name.split(' ').length > 2 ? [talent.name] : talent.name.split(' ')} />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <VerifiedBadge verified={talent.verified} withLabel size="md" />
            <RepresentationLabel type={talent.representation} className="text-xs" />
          </div>
          <p className="mt-6 max-w-xl font-serif text-2xl text-fg italic lg:text-3xl">“{talent.tagline}”</p>
          <dl className="mt-8 grid max-w-xl grid-cols-2 gap-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="flex items-center gap-1.5 text-fg-muted"><MapPin className="size-3.5" aria-hidden /> Based in</dt>
              <dd className="mt-1 font-semibold">{cityName(talent.baseCity)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-fg-muted"><Globe2 className="size-3.5" aria-hidden /> Travels</dt>
              <dd className="mt-1 font-semibold">{talent.travelsPanIndia ? 'Pan-India' : talent.travelsTo.length ? talent.travelsTo.map(cityName).join(', ') : 'Local only'}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-fg-muted"><Languages className="size-3.5" aria-hidden /> Performs in</dt>
              <dd className="mt-1 font-semibold">{talent.languages.join(', ')}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
