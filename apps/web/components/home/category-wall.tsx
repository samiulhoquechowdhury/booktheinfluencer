'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { CategorySlug } from '@repo/schemas';
import { SectionHeading } from '@repo/ui/section-heading';
import { useRichMotion } from '@/lib/motion';

type Item = { slug: CategorySlug; label: string; count: number; image: { src: string; alt: string } };

/**
 * Category wall: huge stacked names. Hover → text fills with gradient and a floating image
 * follows the cursor (desktop). Touch → inline thumbnail, no cursor dependency.
 */
export function CategoryWall({ items }: { items: Item[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const rich = useRichMotion();
  const [active, setActive] = useState<number | null>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 26, mass: 0.6 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 26, mass: 0.6 });
  const rotate = useSpring(useMotionValue(0), { stiffness: 120, damping: 18 });
  const last = useRef(0);

  return (
    <section id="categories" className="relative py-24 md:py-36">
      <div className="shell">
        <SectionHeading
          index="01"
          eyebrow="Launch categories"
          title={<>Five stages. <span className="font-serif font-normal italic">One</span> booking desk.</>}
          className="mb-14 md:mb-20"
        />
        <div
          ref={ref}
          className="relative"
          onPointerMove={(e) => {
            if (!rich) return;
            const r = ref.current!.getBoundingClientRect();
            x.set(e.clientX - r.left);
            y.set(e.clientY - r.top);
            rotate.set(Math.max(-12, Math.min(12, (e.clientX - last.current) * 0.6)));
            last.current = e.clientX;
          }}
          onPointerLeave={() => setActive(null)}
        >
          <ul className="border-t border-border">
            {items.map((it, i) => (
              <li key={it.slug} className="border-b border-border">
                <Link
                  href={`/talent/${it.slug}`}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group relative flex items-center gap-4 py-5 outline-none md:gap-8 md:py-6"
                >
                  <span className="tabular w-8 shrink-0 font-display text-sm font-bold text-fg-subtle md:w-12">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="relative block flex-1 overflow-hidden font-display text-[clamp(2.75rem,10vw,9rem)] leading-[0.9] font-black tracking-[-0.05em] uppercase">
                    <span className="text-outline block [--stroke-color:var(--fg-muted)] transition-opacity duration-(--duration-slow) group-hover:opacity-0 group-focus-visible:opacity-0">
                      {it.label}
                    </span>
                    <span
                      aria-hidden
                      className="text-gradient absolute inset-0 block [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-[700ms] ease-(--ease-out-expo) group-hover:[clip-path:inset(0_0_0_0)] group-focus-visible:[clip-path:inset(0_0_0_0)]"
                    >
                      {it.label}
                    </span>
                  </span>
                  <span className="relative hidden size-16 shrink-0 overflow-hidden rounded-lg sm:block md:hidden">
                    <Image src={it.image.src} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="hidden shrink-0 text-right md:block">
                    <span className="tabular block font-display text-2xl font-bold">{it.count}</span>
                    <span className="text-xs text-fg-muted">verified acts</span>
                  </span>
                  <ArrowUpRight className="size-6 shrink-0 text-fg-muted transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-fg md:size-10" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {rich && (
            <motion.div aria-hidden className="pointer-events-none absolute top-0 left-0 z-10" style={{ x, y, rotate }}>
              <AnimatePresence>
                {active !== null && (
                  <motion.div
                    key="float"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="relative -mt-40 -ml-32 h-80 w-64 overflow-hidden rounded-2xl shadow-float"
                  >
                    {items.map((it, i) => (
                      <motion.div key={it.slug} className="absolute inset-0" animate={{ opacity: active === i ? 1 : 0, scale: active === i ? 1 : 1.15 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                        <Image src={it.image.src} alt="" fill sizes="256px" className="object-cover" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
