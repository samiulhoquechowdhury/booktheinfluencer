'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PublicTalent } from '@repo/schemas';
import { SectionHeading } from '@repo/ui/section-heading';
import { TalentCard } from '@/components/talent/talent-card';
import { Reveal } from '@/lib/motion';

/**
 * Horizontal carousel on native scroll (touch, trackpad, keyboard all work) plus mouse
 * drag-to-scroll with momentum. A drag never triggers the card's click.
 */
export function FeaturedCarousel({ talents }: { talents: PublicTalent[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, lastX: 0, lastT: 0, v: 0, moved: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setProgress(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const glide = () => {
    const el = scroller.current;
    const d = drag.current;
    if (!el || Math.abs(d.v) < 0.05) {
      if (el) el.style.scrollSnapType = '';
      return;
    }
    el.scrollLeft -= d.v * 16;
    d.v *= 0.94;
    raf.current = requestAnimationFrame(glide);
  };

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="featured-title" className="py-24 md:py-36">
      <div className="shell flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          index="03"
          eyebrow="Featured talent"
          title={<span id="featured-title">Headliners, <span className="font-serif font-normal italic">verified.</span></span>}
          description="Featured profiles are paid placements and always marked. Every act is bookable through the same managed process."
        />
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => page(-1)} aria-label="Previous talents" className="grid size-12 place-items-center rounded-full border border-border transition-colors hover:bg-fg hover:text-bg">
            <ArrowLeft className="size-5" />
          </button>
          <button type="button" onClick={() => page(1)} aria-label="Next talents" className="grid size-12 place-items-center rounded-full border border-border transition-colors hover:bg-fg hover:text-bg">
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Same container as the navbar: edges line up with the header capsule */}
      <Reveal className="shell">
        <div
          ref={scroller}
          data-lenis-prevent-wheel
          className="no-scrollbar mt-12 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-6 active:cursor-grabbing md:gap-6"
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse' || !scroller.current) return;
            cancelAnimationFrame(raf.current);
            drag.current = { active: true, startX: e.clientX, startScroll: scroller.current.scrollLeft, lastX: e.clientX, lastT: performance.now(), v: 0, moved: 0 };
            scroller.current.style.scrollSnapType = 'none';
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d.active || !scroller.current) return;
            const now = performance.now();
            d.v = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
            d.lastX = e.clientX;
            d.lastT = now;
            d.moved = Math.max(d.moved, Math.abs(e.clientX - d.startX));
            scroller.current.scrollLeft = d.startScroll - (e.clientX - d.startX);
          }}
          onPointerUp={() => {
            if (!drag.current.active) return;
            drag.current.active = false;
            raf.current = requestAnimationFrame(glide);
          }}
          onPointerLeave={() => {
            if (drag.current.active) {
              drag.current.active = false;
              raf.current = requestAnimationFrame(glide);
            }
          }}
          onClickCapture={(e) => {
            if (drag.current.moved > 6) {
              e.preventDefault();
              e.stopPropagation();
              drag.current.moved = 0;
            }
          }}
          onDragStart={(e) => e.preventDefault()}
        >
          {talents.map((t) => (
            <div key={t.slug} className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-4.5rem)/4)]">
              <TalentCard talent={t} sizes="(min-width: 1440px) 300px, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, (min-width: 640px) 46vw, 76vw" />
            </div>
          ))}
          <Link href="/talent" className="group grid w-[60%] shrink-0 snap-start place-items-center rounded-xl border border-dashed border-border-strong sm:w-[calc((100%-1.25rem)/2)] md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-4.5rem)/4)]">
            <span className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-gradient text-primary-fg transition-transform duration-(--duration-slow) group-hover:scale-110">
                <ArrowRight className="size-6" />
              </span>
              <span className="mt-4 block font-display text-xl font-extrabold">Browse all talent</span>
            </span>
          </Link>
        </div>
      </Reveal>
      <div className="shell">
        <div className="h-px w-full bg-border" aria-hidden>
          <div className="h-px origin-left bg-fg transition-transform duration-150" style={{ transform: `scaleX(${Math.max(0.08, progress)})` }} />
        </div>
      </div>
    </section>
  );
}
