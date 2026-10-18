'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, FileCheck2 } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { Magnetic, Reveal, RevealItem } from '@/lib/motion';

const POINTS = ['One brief, several options', 'GST-ready quotes and contracts', 'One manager from brief to show'];

/**
 * Home "For corporates & planners" panel: copy, benefits and actions on the left; a collage of
 * roster photos with a floating quote card on the right (hidden on small phones).
 */
export function CorporateBand({ images }: { images: { src: string; alt: string; blurDataURL?: string }[] }) {
  const [a, b, c] = images;
  return (
    <section aria-labelledby="corp-title" className="py-20 md:py-28">
      <div className="shell">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-border bg-bg-elevated p-6 sm:p-10 lg:p-14">
          <div aria-hidden className="absolute -top-40 -left-40 -z-10 size-[30rem] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
          <div aria-hidden className="absolute -right-32 -bottom-40 -z-10 size-[26rem] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)]" />

          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Copy */}
            <Reveal stagger className="lg:col-span-6">
              <RevealItem>
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold text-fg-muted">
                  <span aria-hidden className="size-1.5 rounded-full bg-brand-gradient" />
                  For corporates & planners
                </p>
              </RevealItem>
              <RevealItem>
                <h2 id="corp-title" className="font-display text-h1 font-extrabold tracking-tight md:text-[3.25rem] md:leading-[1.02]">
                  Planning an annual day or <span className="font-serif font-normal italic">conference?</span>
                </h2>
              </RevealItem>
              <RevealItem>
                <p className="mt-4 max-w-md text-fg-muted md:text-lg">Tell us the room and the budget. We shortlist the artists and handle everything after.</p>
              </RevealItem>
              <RevealItem>
                <ul className="mt-6 space-y-2.5">
                  {POINTS.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-sm font-medium">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-gradient text-primary-fg">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </RevealItem>
              <RevealItem>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Magnetic>
                    <Button asChild size="lg">
                      <Link href="/enquire">
                        Plan with an expert <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  </Magnetic>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/corporate">Corporate bookings</Link>
                  </Button>
                </div>
              </RevealItem>
            </Reveal>

            {/* Collage */}
            <div aria-hidden className="relative hidden h-[22rem] sm:block lg:col-span-6 lg:h-[28rem]">
              {a && (
                <div className="absolute top-0 left-[4%] h-[78%] w-[46%] overflow-hidden rounded-3xl shadow-float">
                  <Image src={a.src} alt="" fill sizes="(min-width: 1024px) 280px, 40vw" placeholder={a.blurDataURL ? 'blur' : 'empty'} blurDataURL={a.blurDataURL} className="object-cover" />
                </div>
              )}
              {b && (
                <div className="absolute top-[12%] right-[2%] h-[52%] w-[44%] overflow-hidden rounded-3xl shadow-float">
                  <Image src={b.src} alt="" fill sizes="(min-width: 1024px) 260px, 40vw" placeholder={b.blurDataURL ? 'blur' : 'empty'} blurDataURL={b.blurDataURL} className="object-cover" />
                </div>
              )}
              {c && (
                <div className="absolute right-[14%] bottom-0 h-[36%] w-[30%] overflow-hidden rounded-2xl border-4 border-bg-elevated shadow-float">
                  <Image src={c.src} alt="" fill sizes="(min-width: 1024px) 180px, 30vw" placeholder={c.blurDataURL ? 'blur' : 'empty'} blurDataURL={c.blurDataURL} className="object-cover" />
                </div>
              )}
              {/* Floating status card */}
              <div className="absolute bottom-[6%] left-0 flex items-center gap-3 rounded-2xl border border-border bg-bg/90 px-4 py-3 shadow-float backdrop-blur-md motion-safe:animate-[float_6s_ease-in-out_infinite]">
                <span className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success">
                  <FileCheck2 className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Quote ready</span>
                  <span className="block text-xs text-fg-muted">Itemised, with GST</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
