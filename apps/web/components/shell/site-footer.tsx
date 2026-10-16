'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import Link from 'next/link';
import { useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { FOOTER_LINKS } from './nav-links';

/** Footer with a giant wordmark that rises letter by letter as you reach the bottom. */
export function SiteFooter() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const letters = [...BRAND.wordmark];

  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-border bg-bg pt-20">
      <div aria-hidden className="pointer-events-none absolute -bottom-1/2 left-1/2 h-[120%] w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,var(--glow-1),transparent_60%)] opacity-60" />
      <div className="shell relative">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-display text-3xl leading-tight font-extrabold tracking-tight">
              Book the talent.
              <br />
              <span className="font-serif font-normal italic">We handle the rest.</span>
            </p>
            <Link href="/enquire" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-text">
              Start a brief
              <ArrowUpRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {FOOTER_LINKS.map((col) => (
              <div key={col.title}>
                <p className="eyebrow mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-border pt-6 text-xs text-fg-subtle md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.name} (placeholder brand). Fees and availability are confirmed with the authorised representative before booking.</p>
          <p>Prices in INR · Times in IST · Talent images are illustrative placeholders.</p>
        </div>
      </div>
      <p aria-hidden className="relative mt-8 flex justify-center overflow-hidden px-2 font-display text-mega leading-[0.8] font-black select-none">
        {letters.map((ch, i) => (
          <Letter key={i} ch={ch} i={i} n={letters.length} progress={scrollYProgress} reduce={!!reduce} />
        ))}
      </p>
    </footer>
  );
}

function Letter({ ch, i, n, progress, reduce }: { ch: string; i: number; n: number; progress: ReturnType<typeof useScroll>['scrollYProgress']; reduce: boolean }) {
  const start = 0.35 + (i / n) * 0.35;
  const y = useTransform(progress, [start, Math.min(1, start + 0.3)], ['100%', '0%']);
  return (
    <span className="inline-block overflow-hidden pb-[0.04em]">
      <motion.span className="text-gradient inline-block" style={reduce ? undefined : { y }}>
        {ch}
      </motion.span>
    </span>
  );
}
