'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion, useInView } from 'motion/react';
import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, ArrowUpRight, Languages, MapPin } from 'lucide-react';
import type { CategorySlug, PublicTalent } from '@repo/schemas';
import { FeeBand } from '@repo/ui/fee-band';
import { RepresentationLabel } from '@repo/ui/representation-label';
import { VerifiedBadge } from '@repo/ui/verified-badge';
import { cn } from '@repo/ui/lib/cn';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { ctaLabelForTier, formatFeeBand } from '@repo/utils';
import { FavouriteButton } from '@/components/talent/favourite-button';
import { MORPH_NAME } from '@/components/talent/talent-card';
import { TierTag } from '@/components/talent/tier-tag';
import { Magnetic, Reveal, usePageTransition } from '@/lib/motion';
import { CATEGORIES, categorySingular, cityName } from '@/lib/reference';

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTO_MS = 6000;

/**
 * Featured talent as an editorial spotlight: one act large, the line-up beside it.
 * Auto-advances (CSS timer, pauses on hover/focus, off for reduced motion); category chips filter.
 * Featured = paid placement, always labelled (design.md §6.1).
 */
export function FeaturedSpotlight({ talents }: { talents: PublicTalent[] }) {
  const reduce = useReducedMotion();
  const { navigateWithMorph } = usePageTransition();
  const [cat, setCat] = useState<CategorySlug | 'all'>('all');
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const railRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.35 });

  const cats = useMemo(() => CATEGORIES.filter((c) => talents.some((t) => t.categories.includes(c.slug))), [talents]);
  const list = useMemo(() => (cat === 'all' ? talents : talents.filter((t) => t.categories.includes(cat))), [talents, cat]);
  const active = list[Math.min(index, list.length - 1)];

  const select = (i: number) => {
    const next = (i + list.length) % list.length;
    setDir(next >= index ? 1 : -1);
    setIndex(next);
    // Scroll only the rail (horizontal on phones) — never the page.
    const rail = railRef.current;
    const el = rail?.querySelector<HTMLElement>(`[data-i="${next}"]`);
    if (rail && el && rail.scrollWidth > rail.clientWidth) {
      rail.scrollTo({ left: el.offsetLeft - (rail.clientWidth - el.clientWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  if (!active) return null;
  const cover = active.images[0]!;
  const href = `/t/${active.slug}`;
  const openProfile = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    document.querySelectorAll<HTMLElement>('[data-morph]').forEach((el) => (el.style.viewTransitionName = ''));
    const img = document.querySelector<HTMLElement>('[data-spot-image]');
    if (img) img.style.viewTransitionName = MORPH_NAME;
    navigateWithMorph(href);
  };

  return (
    <section ref={sectionRef} aria-labelledby="featured-title" className="relative overflow-hidden py-24 md:py-36">
      <div aria-hidden className="pointer-events-none absolute top-1/3 -left-40 size-[36rem] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)] opacity-60" />
      <div className="shell relative">
        {/* Header */}
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="mb-5 flex items-center gap-3">
              <span className="tabular font-display text-sm font-bold text-primary-text">03</span>
              <span aria-hidden className="h-px w-8 bg-border-strong" />
              <span className="eyebrow">Featured talent</span>
            </p>
            <h2 id="featured-title" className="font-display text-display font-extrabold">
              Headliners, <span className="font-serif font-normal italic">verified.</span>
            </h2>
          </div>
          <LayoutGroup id="featured-cats">
            <div role="group" aria-label="Filter featured talent" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
              {[{ slug: 'all' as const, name: 'All' }, ...cats].map((c) => {
                const on = cat === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setCat(c.slug);
                      setIndex(0);
                      setDir(1);
                    }}
                    className={cn('relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors', on ? 'text-bg' : 'text-fg-muted hover:text-fg')}
                  >
                    {on && <motion.span layoutId="feat-cat-pill" className="absolute inset-0 rounded-full bg-fg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                    <span className="relative">{c.slug === 'speakers' ? 'Speakers' : c.name}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-12 lg:gap-8">
          {/* Spotlight */}
          <article
            id="featured-panel"
            role="tabpanel"
            aria-label={`${active.name}, ${categorySingular(active.primaryCategory)}`}
            className="group/spot relative isolate min-w-0 overflow-hidden rounded-3xl bg-surface-2 lg:col-span-8"
          >
            <div className="relative aspect-[4/5] sm:aspect-[16/11] lg:aspect-auto lg:h-full lg:min-h-[680px]">
              <AnimatePresence initial={false} custom={dir}>
                <motion.div
                  key={active.slug}
                  custom={dir}
                  data-spot-image
                  className="absolute inset-0"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, clipPath: 'inset(0 0 0 0%)' }}
                  exit={{ opacity: 0, transition: { duration: 0.5 } }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  <Image
                    src={cover.src}
                    alt={cover.alt}
                    fill
                    sizes="(min-width: 1440px) 860px, (min-width: 1024px) 62vw, 100vw"
                    placeholder={cover.blurDataURL ? 'blur' : 'empty'}
                    blurDataURL={cover.blurDataURL}
                    className="object-cover object-[center_22%] transition-transform duration-[1.6s] ease-(--ease-out-expo) group-hover/spot:scale-[1.03]"
                  />
                </motion.div>
              </AnimatePresence>
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20 sm:from-black/90 sm:via-black/35 sm:to-black/10" />
              <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-r from-black/50 to-transparent sm:block" />

              {/* Top bar */}
              <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-5 sm:p-7">
                <div className="flex flex-wrap gap-1.5">
                  <TierTag tier={active.tier} featured={active.featured} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular font-display text-sm font-bold text-white/80">
                    {String(index + 1).padStart(2, '0')}
                    <span className="text-white/40"> / {String(list.length).padStart(2, '0')}</span>
                  </span>
                  <FavouriteButton talent={active} />
                </div>
              </div>

              {/* Auto-advance timer */}
              {list.length > 1 && !reduce && (
                <div aria-hidden className="absolute inset-x-5 top-3 z-10 h-0.5 overflow-hidden rounded-full bg-white/20 sm:inset-x-7 sm:top-3.5">
                  <div key={`${cat}-${index}`} className="spot-progress h-full bg-white" style={{ ['--spot-ms' as string]: `${AUTO_MS}ms`, animationPlayState: inView ? undefined : 'paused' }} onAnimationEnd={() => select(index + 1)} />
                </div>
              )}

            </div>

            {/* Copy — below the photo on phones, overlaid from sm up */}
            <div className="relative z-10 bg-black p-5 text-white sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-transparent sm:p-8 lg:p-10">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.slug}
                    initial={reduce ? false : 'hide'}
                    animate="show"
                    exit="hide"
                    variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } }, hide: {} }}
                  >
                    <motion.p variants={{ hide: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
                      <span className="font-semibold text-white">{active.categories.map(categorySingular).join(' · ')}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{cityName(active.baseCity)}{active.travelsPanIndia && ' · Pan-India'}</span>
                      <span className="hidden items-center gap-1 sm:inline-flex"><Languages className="size-3.5" aria-hidden />{active.languages.join(', ')}</span>
                    </motion.p>
                    <motion.h3
                      variants={{ hide: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}
                      className="mt-3 flex items-center gap-3 font-display text-[clamp(2.25rem,1rem+5.5vw,6rem)] leading-[0.9] font-black tracking-[-0.045em] uppercase"
                    >
                      {active.name}
                      <VerifiedBadge verified={active.verified} size="lg" className="text-gold" />
                    </motion.h3>
                    <motion.p variants={{ hide: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }} className="mt-3 max-w-xl font-serif text-xl text-white/85 italic sm:text-2xl">
                      “{active.tagline}”
                    </motion.p>
                    <motion.div
                      variants={{ hide: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                      className="mt-6 flex flex-col gap-5 border-t border-white/15 pt-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-3 [&_.text-fg]:text-white [&_.text-fg-muted]:text-white/60">
                        <FeeBand band={active.feeBand} size="lg" withInfo />
                        <RepresentationLabel type={active.representation} className="border-white/25 text-white/75" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <Magnetic className="contents sm:inline-flex">
                          <Link href={`/enquire?talent=${active.slug}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold whitespace-nowrap text-black transition-transform active:scale-[0.97] sm:px-6">
                            {ctaLabelForTier(active.tier)} <ArrowRight className="size-4" aria-hidden />
                          </Link>
                        </Magnetic>
                        <Link href={href} onClick={openProfile} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-5 text-sm font-semibold whitespace-nowrap text-white backdrop-blur-md transition-colors hover:bg-white/10">
                          View profile <ArrowUpRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
            </div>
          </article>

          {/* Line-up */}
          <div className="min-w-0 lg:col-span-4">
            <div className="mb-3 hidden items-center justify-between lg:flex">
              <p className="eyebrow">The line-up</p>
              <p className="text-xs text-fg-subtle">Featured placements are paid</p>
            </div>
            <div
              ref={railRef}
              role="tablist"
              aria-label="Featured talent"
              aria-orientation="vertical"
              className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
              onKeyDown={(e) => {
                if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
                  e.preventDefault();
                  select(index + 1);
                } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
                  e.preventDefault();
                  select(index - 1);
                }
              }}
            >
              <LayoutGroup id="featured-rows">
                {list.map((t, i) => {
                  const on = i === index;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      role="tab"
                      data-i={i}
                      aria-selected={on}
                      aria-controls="featured-panel"
                      tabIndex={on ? 0 : -1}
                      onClick={() => select(i)}
                      className={cn(
                        'group/row relative flex w-40 shrink-0 snap-start flex-col gap-2 rounded-2xl p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-auto lg:flex-row lg:items-center lg:gap-4 lg:p-2.5',
                        on ? 'text-fg' : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      {on && <motion.span layoutId="feat-row-bg" className="absolute inset-0 -z-0 rounded-2xl border border-border bg-surface" transition={{ type: 'spring', stiffness: 400, damping: 36 }} />}
                      <span className="tabular relative hidden w-6 shrink-0 font-display text-xs font-bold text-fg-subtle lg:block">{String(i + 1).padStart(2, '0')}</span>
                      <span className={cn('relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-xl bg-surface-3 lg:aspect-square lg:w-16', !on && 'opacity-80 grayscale-[60%] transition-[filter,opacity] group-hover/row:opacity-100 group-hover/row:grayscale-0')}>
                        <Image src={t.images[0]!.src} alt="" fill sizes="(min-width: 1024px) 64px, 160px" quality={60} placeholder={t.images[0]!.blurDataURL ? 'blur' : 'empty'} blurDataURL={t.images[0]!.blurDataURL} className="object-cover" />
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate font-display text-base font-extrabold tracking-tight lg:text-lg">
                          {t.name}
                          <VerifiedBadge verified={t.verified} size="sm" />
                        </span>
                        <span className="block truncate text-xs text-fg-muted">{categorySingular(t.primaryCategory)} · {cityName(t.baseCity)}</span>
                      </span>
                      <span className="tabular relative hidden shrink-0 text-sm font-semibold whitespace-nowrap xl:block">{formatFeeBand(t.feeBand).range}</span>
                      {on && <motion.span layoutId="feat-row-bar" aria-hidden className="absolute top-1/2 -left-px hidden h-8 w-1 -translate-y-1/2 rounded-full bg-brand-gradient lg:block" />}
                    </button>
                  );
                })}
              </LayoutGroup>
            </div>

            <Reveal className="mt-6 hidden lg:block">
              <Link href="/talent" className="group/all flex items-center justify-between rounded-2xl border border-dashed border-border-strong p-5 transition-colors hover:border-primary-text">
                <span>
                  <span className="block font-display text-lg font-extrabold">Browse all talent</span>
                  <span className="text-sm text-fg-muted">Every act, same managed booking</span>
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-brand-gradient text-primary-fg transition-transform duration-(--duration-slow) group-hover/all:translate-x-1">
                  <ArrowRight className="size-5" aria-hidden />
                </span>
              </Link>
            </Reveal>
            <p className="mt-4 text-xs text-fg-subtle lg:hidden">Featured placements are paid and always marked. <Link href="/talent" className="font-semibold text-fg underline-offset-4 hover:underline">Browse all talent →</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}
