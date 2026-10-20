'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@repo/ui/lib/cn';
import { useReducedMotion } from '@/lib/motion';

export type CategoryBanner = {
  slug: string;
  title: string;
  cta: string;
  image: { src: string; blurDataURL?: string };
};

const AUTO_MS = 5000;
const SLIDE_MS = 700;
const GAP = 16; // px between banners

/**
 * Category banners at the top of the hero. Each is a designed artwork (art on the right, open
 * space on the left) with a short bold title and one button over the left side.
 *
 * Infinite carousel: the list is rendered twice and a transform-driven track always slides
 * forward; after passing the last original banner it silently resets to its twin, so the loop
 * never rewinds. One banner per view on phones, two from md up. Swipe on touch; pauses on
 * hover/focus and for reduced motion.
 */
export function CategoryBanners({ banners }: { banners: CategoryBanner[] }) {
  const reduce = useReducedMotion();
  const n = banners.length;
  const items = [...banners, ...banners];
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);

  const next = () => {
    setAnimate(true);
    setIndex((i) => i + 1);
  };
  const prev = () => {
    if (index === 0) {
      // Jump (unanimated) to the clone of the first banner, then slide back one.
      setAnimate(false);
      setIndex(n);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setAnimate(true);
          setIndex(n - 1);
        }),
      );
      return;
    }
    setAnimate(true);
    setIndex((i) => i - 1);
  };
  const goTo = (i: number) => {
    setAnimate(true);
    setIndex(i);
  };

  // After landing on a clone, snap back to its original without animation.
  const onTransitionEnd = () => {
    if (index >= n) {
      setAnimate(false);
      setIndex((i) => i - n);
    }
  };
  useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  useEffect(() => {
    if (reduce || paused || n < 2) return;
    const id = setInterval(next, AUTO_MS);
    return () => clearInterval(id);
  }, [reduce, paused, n]);

  const active = index % n;

  return (
    <div
      className="w-full"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="overflow-hidden rounded-3xl"
        aria-roledescription="carousel"
        aria-label="Talent categories"
        onTouchStart={(e) => {
          touch.current = e.touches[0]!.clientX;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          setPaused(false);
          if (start == null) return;
          const dx = e.changedTouches[0]!.clientX - start;
          if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        }}
      >
        <div
          className="flex [--card:100%] md:[--card:calc(50%-8px)]"
          onTransitionEnd={onTransitionEnd}
          style={
            {
              gap: GAP,
              transform: `translate3d(calc(${-index} * (var(--card) + ${GAP}px)), 0, 0)`,
              transition: animate && !reduce ? `transform ${SLIDE_MS}ms cubic-bezier(0.65, 0, 0.35, 1)` : 'none',
            } as CSSProperties
          }
        >
          {items.map((b, i) => (
            <Link
              key={`${b.slug}-${i}`}
              href={`/talent/${b.slug}`}
              tabIndex={i >= n ? -1 : undefined}
              aria-hidden={i >= n ? true : undefined}
              className="group relative isolate block h-[25vh] max-h-72 min-h-44 w-(--card) shrink-0 overflow-hidden rounded-3xl border border-black/5 bg-[#f3f0fa] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Image
                src={b.image.src}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                placeholder={b.image.blurDataURL ? 'blur' : 'empty'}
                blurDataURL={b.image.blurDataURL}
                // Only the first banner is the LCP image on phones; preloading the second competed with it on slow links.
                priority={i === 0}
                loading={i === 1 ? 'eager' : undefined}
                className="-z-10 object-cover object-right transition-transform duration-[1200ms] ease-(--ease-out-expo) group-hover:scale-[1.03]"
              />
              {/* Soft light fade keeps the copy legible where the art reaches in (narrow screens). */}
              <span aria-hidden className="absolute inset-y-0 left-0 -z-10 w-[62%] bg-gradient-to-r from-white/85 via-white/55 to-transparent sm:hidden" />
              <div className="flex h-full w-[52%] flex-col justify-center gap-3 p-4 sm:w-[55%] sm:gap-4 sm:p-8">
                <p className="font-display text-lg leading-[1.05] font-black tracking-[-0.02em] text-[#16121f] sm:text-2xl lg:text-[2rem]">{b.title}</p>
                <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-[#16121f] px-3 py-1.5 text-[0.6875rem] font-semibold whitespace-nowrap text-white sm:gap-2 transition-[transform,background-color] duration-(--duration-base) group-hover:-translate-y-0.5 group-hover:bg-[#2c2340] sm:px-5 sm:py-2.5 sm:text-sm">
                  {b.cta}
                  <ArrowRight className="size-3.5 shrink-0 transition-transform duration-(--duration-base) group-hover:translate-x-1 sm:size-4" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-1.5" role="tablist" aria-label="Choose a category banner">
        {banners.map((b, i) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={b.title}
            onClick={() => goTo(i)}
            className={cn('h-1.5 rounded-full transition-[width,background-color] duration-(--duration-slow)', i === active ? 'w-6 bg-brand-gradient' : 'w-1.5 bg-border-strong hover:bg-fg-subtle')}
          />
        ))}
      </div>
    </div>
  );
}
