'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { ArrowRight, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PublicTalent } from '@repo/schemas';
import { SearchBar } from '@/components/search/search-bar';
import { CategoryBanners, type CategoryBanner } from './category-banners';
import { SplitText } from '@/lib/motion';
import { categorySingular } from '@/lib/reference';
import { cn } from '@repo/ui/lib/cn';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fan layout, left → right. The outer pair is hidden on phones so three cards stay large. */
const FAN = [
  { rot: -10, y: '22%', cls: 'hidden w-[19%] sm:block', z: 'z-10' },
  { rot: -5, y: '9%', cls: 'w-[31%] sm:w-[21%]', z: 'z-20' },
  { rot: 0, y: '0%', cls: 'w-[38%] sm:w-[25%]', z: 'z-30' },
  { rot: 5, y: '9%', cls: 'w-[31%] sm:w-[21%]', z: 'z-20' },
  { rot: 10, y: '22%', cls: 'hidden w-[19%] sm:block', z: 'z-10' },
] as const;

const CHECKS = ['Managed end to end', 'Itemised quotes', 'Secure payments'];

/**
 * Hero: category banners under the navbar, then the centred badge, two-line headline, single
 * search field, a fan of featured talent cards and a "See all talent" link.
 */
export function Hero({ mosaic, banners }: { mosaic: PublicTalent[]; banners: CategoryBanner[] }) {
  const reduce = useReducedMotion();
  const cards = mosaic.slice(0, FAN.length);
  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: EASE, delay } });

  return (
    <section className="relative isolate overflow-hidden pt-24 md:pt-28">
      {/* Glows */}
      <div aria-hidden className="absolute top-[8%] left-1/2 -z-10 size-[44rem] -translate-x-[75%] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)] blur-2xl motion-safe:animate-[float_14s_ease-in-out_infinite]" />
      <div aria-hidden className="absolute top-[20%] left-1/2 -z-10 size-[36rem] -translate-x-[15%] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)] blur-2xl motion-safe:animate-[float_18s_ease-in-out_infinite_reverse]" />

      {/* Category banners, clear of the floating navbar */}
      <motion.div {...rise(0)} className="shell">
        <CategoryBanners banners={banners} />
      </motion.div>

      <div className="shell mt-8 flex flex-col items-center text-center md:mt-10">
        <SplitText
          as="h1"
          by="line"
          trigger="mount"
          delay={0.12}
          className="font-display text-[clamp(2.75rem,1rem+7.4vw,7.75rem)] leading-[0.92] font-black tracking-[-0.045em]"
          lines={[
            { text: 'Book the Talent.', node: <>Book the <BrushWord>Talent.</BrushWord></> },
            'We Handle the Rest.',
          ]}
        />

        <motion.p {...rise(0.45)} className="mt-6 max-w-xl text-base text-fg-muted md:text-lg">
          Book trusted actors, singers, comedians, anchors and creators from Assam and across India, all in one place.
        </motion.p>

        <motion.div {...rise(0.6)} className="mt-8 w-full max-w-xl">
          <SearchBar />
        </motion.div>

        <motion.ul {...rise(0.7)} className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-fg">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <CircleCheck className="size-4 text-primary-text" aria-hidden />
              {c}
            </li>
          ))}
        </motion.ul>
      </div>

      {/* Talent fan */}
      {cards.length > 0 && (
        <div className="relative mx-auto mt-12 flex max-w-5xl items-start justify-center px-2 pb-[3%] md:mt-16">
          {cards.map((t, i) => {
            const f = FAN[i]!;
            const img = t.images[0]!;
            return (
              <motion.div
                key={t.slug}
                className={cn('relative -mx-[1.5%] shrink-0', f.cls, f.z)}
                style={{ rotate: f.rot, y: f.y }}
                initial={reduce ? false : { opacity: 0, y: '45%' }}
                animate={{ opacity: 1, y: f.y }}
                transition={{ duration: 1, ease: EASE, delay: 0.55 + Math.abs(i - 2) * 0.1 }}
              >
                <Link
                  href={`/t/${t.slug}`}
                  className="group block rounded-[1.75rem] border border-border-strong bg-bg-elevated p-1.5 shadow-float outline-none transition-transform duration-(--duration-slow) ease-(--ease-out-expo) hover:-translate-y-4 focus-visible:-translate-y-4 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-[1.375rem] bg-surface-2">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      priority={i === 2}
                      placeholder={img.blurDataURL ? 'blur' : 'empty'}
                      blurDataURL={img.blurDataURL}
                      sizes="(min-width: 1024px) 260px, (min-width: 640px) 25vw, 38vw"
                      className="object-cover transition-transform duration-[900ms] ease-(--ease-out-expo) group-hover:scale-105"
                    />
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent" />
                    <span className="absolute inset-x-2 bottom-2 text-left text-white sm:inset-x-3 sm:bottom-3">
                      <span className="block truncate text-xs font-semibold sm:text-sm">{t.name}</span>
                      <span className="block truncate text-[0.625rem] text-white/75 sm:text-xs">{categorySingular(t.primaryCategory)}</span>
                    </span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* See all talent */}
      <div className="relative z-40 mt-4 flex justify-center pb-4 md:mt-6 md:pb-8">
        <Link
          href="/talent"
          className="group relative isolate inline-flex h-14 items-center overflow-hidden rounded-full border border-border-strong bg-bg-elevated pr-[62px] pl-7 font-semibold text-fg shadow-card transition-[border-color,box-shadow,color,transform] duration-500 ease-(--ease-out-expo) hover:border-transparent hover:text-primary-fg hover:shadow-[0_18px_40px_-16px_var(--glow-1)] active:scale-[0.98]"
        >
          {/* Gradient disc: 6px inset circle (matches the search field) that grows to fill the pill on hover. */}
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 bottom-1.5 -z-10 w-11 rounded-full bg-brand-gradient transition-[width] duration-500 ease-(--ease-out-expo) group-hover:w-[calc(100%-12px)] group-focus-visible:w-[calc(100%-12px)]"
          />
          <span className="relative">See all talent</span>
          {/* Arrow: slides out right while its twin slides in from the left. */}
          <span aria-hidden className="absolute top-1.5 right-1.5 grid size-11 place-items-center overflow-hidden rounded-full text-primary-fg">
            <ArrowRight className="size-5 transition-[transform,opacity] duration-500 ease-(--ease-out-expo) group-hover:translate-x-[250%] group-hover:opacity-0" />
            <ArrowRight className="absolute size-5 -translate-x-[250%] opacity-0 transition-[transform,opacity] duration-500 ease-(--ease-out-expo) group-hover:translate-x-0 group-hover:opacity-100" />
          </span>
        </Link>
      </div>
    </section>
  );
}

/** Gradient word over a hand-painted brush stroke that sweeps in from the left. */
function BrushWord({ children }: { children: ReactNode }) {
  return (
    <span className="relative isolate inline-block">
      <svg
        aria-hidden
        viewBox="0 0 300 60"
        preserveAspectRatio="none"
        className="absolute inset-x-[-5%] top-[22%] bottom-[-2%] -z-10 h-[86%] w-[110%] text-(--brush) motion-safe:animate-[brush-in_0.9s_var(--ease-out-expo)_0.55s_both]"
      >
        <defs>
          {/* Rough, dry-brush edges. */}
          <filter id="brush-rough" x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045 0.6" numOctaves="3" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
          </filter>
        </defs>
        <g filter="url(#brush-rough)" fill="currentColor">
          <path d="M6 32C40 16 120 9 214 10c38 0 66 3 80 8 6 4 5 14-2 19-44 12-150 18-250 17C18 54 2 47 6 32Z" />
          <path opacity="0.55" d="M20 14c70-8 170-10 262-2 6 1 6 6 0 7-90-4-190-2-262 4-5 0-6-8 0-9Z" />
          <path opacity="0.45" d="M14 52c90 4 190 2 270-8 6-1 7 5 1 7-84 12-190 14-272 8-5-1-5-7 1-7Z" />
        </g>
      </svg>
      <span className="text-gradient pr-[0.1em]">{children}</span>
    </span>
  );
}
