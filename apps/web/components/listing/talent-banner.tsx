'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { CategorySlug } from '@repo/schemas';
import { cn } from '@repo/ui/lib/cn';
import { BANNERS } from '@/lib/banners';
import { useReducedMotion } from '@/lib/motion';

const AUTO_MS = 6000;

/**
 * Full-width banner (navbar width, a quarter of the viewport tall) for listing pages. The artwork
 * sits on the right and its pastel edge colour extends left under the copy, so wide screens never
 * crop the art. Crossfades through the banners; starts on `category` when one is given.
 */
export function TalentBanner({ category }: { category?: CategorySlug }) {
  const reduce = useReducedMotion();
  const first = Math.max(0, BANNERS.findIndex((b) => b.slug === category));
  const [i, setI] = useState(first);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => setI((n) => (n + 1) % BANNERS.length), AUTO_MS);
    return () => clearInterval(id);
  }, [reduce, paused]);

  const b = BANNERS[i]!;

  return (
    <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div
        className="relative isolate h-[25vh] max-h-72 min-h-44 overflow-hidden rounded-3xl border border-black/5 shadow-card transition-colors duration-700"
        style={{ backgroundColor: b.tint }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={b.slug}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Artwork, right-aligned at full height; its left edge fades into the tint. */}
            <div className="absolute inset-y-0 right-0 aspect-[2.11/1] max-w-full [mask-image:linear-gradient(to_right,transparent,black_18%)]">
              <Image
                src={b.image.src}
                alt=""
                fill
                sizes="(min-width: 768px) 640px, 100vw"
                placeholder="blur"
                blurDataURL={b.image.blurDataURL}
                priority={i === first}
                className="object-cover object-right"
              />
            </div>
            {/* Narrow screens: soft wash keeps the copy readable over the art. */}
            <span aria-hidden className="absolute inset-y-0 left-0 w-2/3 sm:hidden" style={{ background: `linear-gradient(to right, ${b.tint} 45%, transparent)` }} />

            <div className="relative flex h-full max-w-[60%] flex-col justify-center gap-3 p-5 sm:max-w-[50%] sm:gap-4 sm:p-8 lg:p-10">
              <p className="font-display text-xl leading-[1.05] font-black tracking-[-0.02em] text-[#16121f] sm:text-3xl lg:text-4xl">{b.title}</p>
              <Link
                href={`/talent/${b.slug}`}
                className="group inline-flex w-fit items-center gap-2 rounded-full bg-[#16121f] px-4 py-2 text-xs font-semibold text-white transition-[transform,background-color] duration-(--duration-base) hover:-translate-y-0.5 hover:bg-[#2c2340] sm:px-5 sm:py-2.5 sm:text-sm"
              >
                {b.cta}
                <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots, inside the banner bottom-left */}
        <div className="absolute bottom-3 left-5 z-10 flex gap-1.5 sm:left-8 lg:left-10" role="tablist" aria-label="Choose a banner">
          {BANNERS.map((x, n) => (
            <button
              key={x.slug}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={x.title}
              onClick={() => setI(n)}
              className={cn('h-1.5 rounded-full transition-[width,background-color] duration-(--duration-slow)', n === i ? 'w-6 bg-[#16121f]' : 'w-1.5 bg-[#16121f]/25 hover:bg-[#16121f]/50')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
