'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { useRef } from 'react';
import type { PublicTalent } from '@repo/schemas';
import { SearchBar } from '@/components/search/search-bar';
import { SplitText } from '@/lib/motion';

/**
 * Hero: line-by-line split headline over a slow drifting mosaic of featured talent photos,
 * soft radial glows, glass search bar and an animated scroll cue.
 */
export function Hero({ mosaic }: { mosaic: PublicTalent[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const mosaicY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Repeat the featured set until every column has enough tiles to drift without gaps.
  const tiles = mosaic.length ? Array.from({ length: Math.max(18, mosaic.length) }, (_, i) => mosaic[i % mosaic.length]!) : [];
  const columns = [0, 1, 2, 3, 4, 5].map((c) => tiles.filter((_, i) => i % 6 === c));

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-28 pb-10 md:pt-36">
      {/* Mosaic */}
      <motion.div aria-hidden style={reduce ? undefined : { y: mosaicY }} className="absolute inset-0 -z-20">
        <div className="absolute inset-[-10%] flex rotate-[-8deg] gap-3 opacity-[0.28] dark:opacity-[0.22] md:gap-4">
          {columns.map((col, ci) => (
            <div
              key={ci}
              className={`flex min-w-0 flex-1 flex-col gap-3 md:gap-4 ${ci % 2 ? 'motion-safe:animate-[drift-down_60s_linear_infinite]' : 'motion-safe:animate-[drift-up_70s_linear_infinite]'} ${ci > 3 ? 'hidden md:flex' : ''}`}
            >
              {[...col, ...col].map((t, i) => (
                <div key={`${t.slug}-${i}`} className="relative aspect-[4/5] overflow-hidden rounded-xl">
                  <Image src={t.images[0]!.src} alt="" fill sizes="(min-width: 768px) 20vw, 30vw" quality={35} loading="lazy" fetchPriority="low" className="object-cover grayscale" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--bg)_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg to-transparent" />
      </motion.div>

      {/* Glows */}
      <div aria-hidden className="absolute top-[18%] left-1/2 -z-10 size-[42rem] -translate-x-[70%] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)] blur-2xl motion-safe:animate-[float_14s_ease-in-out_infinite]" />
      <div aria-hidden className="absolute top-[34%] left-1/2 -z-10 size-[34rem] -translate-x-[10%] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)] blur-2xl motion-safe:animate-[float_18s_ease-in-out_infinite_reverse]" />

      <motion.div style={reduce ? undefined : { opacity: fade }} className="shell relative flex flex-1 flex-col">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="glass mx-auto mb-8 md:mx-0 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-fg-muted"
        >
          <span className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-success motion-safe:animate-ping" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          Managed bookings across 8 Indian cities
        </motion.p>

        <SplitText
          as="h1"
          by="line"
          trigger="mount"
          delay={0.15}
          className="text-center font-display text-hero font-black uppercase md:text-left"
          lines={[
            { text: 'Book the talent.', node: <>Book the <span className="text-outline">talent.</span></> },
            {
              text: 'We handle the rest.',
              node: (
                <>
                  We handle the{' '}
                  <span className="text-gradient pr-[0.06em] font-serif font-normal normal-case italic tracking-[-0.02em]">rest.</span>
                </>
              ),
            },
          ]}
        />

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.75 }}
          className="mt-8 grid gap-8 text-center md:text-left lg:mt-12 xl:grid-cols-12 xl:items-end"
        >
          <div className="mx-auto max-w-xl md:mx-0 xl:col-span-5">
            <h2 className="text-lg font-semibold text-fg md:text-xl">Book verified talent for any event.</h2>
            <p className="mx-auto mt-2 max-w-md text-fg-muted md:mx-0 md:text-lg">
              Actors, singers, DJs, comedians, anchors and creators — with contracts, secure payments and a dedicated manager.
            </p>
            <Link href="/enquire" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-text underline-offset-4 hover:underline">
              Or plan with an expert →
            </Link>
          </div>
          <div className="max-w-4xl xl:col-span-7 xl:max-w-none">
            <SearchBar />
          </div>
        </motion.div>

        <div className="mt-auto flex items-end justify-center pt-12 md:justify-between">
          <a href="#categories" className="group flex items-center gap-3 text-xs font-medium tracking-[0.2em] text-fg-muted uppercase hover:text-fg">
            <span className="relative block h-12 w-px overflow-hidden bg-border">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-fg motion-safe:animate-scroll-cue" />
            </span>
            Scroll to explore
          </a>
          <p className="hidden text-right text-xs text-fg-subtle md:block">
            Fees on request.
            <br />
            Confirmed with the authorised representative.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
