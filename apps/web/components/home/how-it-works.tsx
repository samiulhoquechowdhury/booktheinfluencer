'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { cn } from '@repo/ui/lib/cn';
import { loadGsap, useMediaQuery, useReducedMotion } from '@/lib/motion';
import { BriefMock, EnjoyMock, QuoteMock, VerifyMock } from './step-mocks';

const STEPS = [
  { n: '01', title: 'Brief', body: 'Tell us the event, date, city, audience and budget. One form — no calling five agents.', Mock: BriefMock },
  { n: '02', title: 'We verify', body: 'Your manager checks real availability with the authorised representative. You see honest status, never a guess.', Mock: VerifyMock },
  { n: '03', title: 'Quote & contract', body: 'An itemised quote with every cost, GST and a payment schedule. Accept online; sign the contract digitally.', Mock: QuoteMock },
  { n: '04', title: 'Enjoy the event', body: 'Confirmed only after contract, advance and representative sign-off. We coordinate travel, rider and the day itself.', Mock: EnjoyMock },
] as const;

/**
 * Pinned horizontal scrub (GSAP ScrollTrigger, lazy-loaded) on desktop.
 * Mobile / reduced motion: a simple vertical list; each mock plays when in view.
 */
export function HowItWorks() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useMediaQuery('(min-width: 768px)');
  const horizontal = desktop && !reduce;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!horizontal) return;
    let cleanup = () => {};
    let cancelled = false;
    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled || !section.current || !track.current) return;
      const ctx = gsap.context(() => {
        const distance = () => track.current!.scrollWidth - window.innerWidth;
        gsap.to(track.current, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              setActive(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length * 0.999 + 0.12)));
              if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
            },
          },
        });
      }, section);
      ScrollTrigger.refresh();
      cleanup = () => ctx.revert();
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [horizontal]);

  return (
    <section ref={section} aria-labelledby="hiw-title" className={cn('relative overflow-hidden bg-surface/40', horizontal ? 'h-svh' : 'py-24')}>
      <div className={cn('flex flex-col', horizontal && 'h-full pt-28 pb-10')}>
        <div className="shell flex items-end justify-between gap-6">
          <div>
            <p className="mb-5 flex items-center gap-3">
              <span className="tabular font-display text-sm font-bold text-primary-text">02</span>
              <span aria-hidden className="h-px w-8 bg-border-strong" />
              <span className="eyebrow">How it works</span>
            </p>
            <h2 id="hiw-title" className="font-display text-display font-extrabold">
              Four steps. <span className="font-serif font-normal italic">Zero</span> guesswork.
            </h2>
          </div>
          {horizontal && (
            <p className="tabular hidden font-display text-6xl font-black text-fg-subtle lg:block" aria-hidden>
              {STEPS[active]!.n}<span className="text-2xl">/04</span>
            </p>
          )}
        </div>

        <div
          ref={track}
          className={cn(horizontal ? 'mt-auto flex w-max gap-6 pr-[10vw] pl-[max(1rem,calc((100vw-1280px)/2+5rem))]' : 'shell mt-12 grid gap-6')}
        >
          {STEPS.map((s, i) => (
            <Step key={s.n} step={s} active={horizontal ? active === i : undefined} horizontal={horizontal} />
          ))}
        </div>

        {horizontal && (
          <div className="shell mt-8">
            <div className="h-px w-full bg-border">
              <div ref={bar} className="h-px w-full origin-left scale-x-0 bg-brand-gradient" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Step({ step, active, horizontal }: { step: (typeof STEPS)[number]; active?: boolean; horizontal: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6, once: true });
  const on = active ?? inView;
  const { Mock } = step;
  return (
    <article
      ref={ref}
      className={cn(
        'grid items-center gap-8 rounded-3xl border border-border bg-bg p-6 transition-[opacity,border-color] duration-(--duration-slower) md:grid-cols-2 md:p-10',
        horizontal && 'h-[min(64vh,560px)] w-[min(78vw,980px)]',
        horizontal && !on && 'opacity-50',
        on && 'border-border-strong',
      )}
    >
      <div>
        <p className="tabular font-display text-[5rem] leading-none font-black text-transparent [-webkit-text-stroke:1.5px_var(--border-strong)] md:text-[7rem]">{step.n}</p>
        <h3 className="mt-4 font-display text-h1 font-extrabold">{step.title}</h3>
        <p className="mt-3 max-w-sm text-fg-muted md:text-lg">{step.body}</p>
      </div>
      <div className="flex justify-center">
        <Mock active={on} />
      </div>
    </article>
  );
}
