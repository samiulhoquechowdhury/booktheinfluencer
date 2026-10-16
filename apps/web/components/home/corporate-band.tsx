'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { Magnetic, Parallax, SplitText } from '@/lib/motion';

export function CorporateBand({ images }: { images: { src: string; alt: string }[] }) {
  const [a, b, c] = images;
  return (
    <section aria-labelledby="corp-title" className="relative overflow-hidden py-24 md:py-40">
      <div className="shell grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="relative z-10 lg:col-span-7">
          <p className="mb-6 flex items-center gap-3">
            <span className="tabular font-display text-sm font-bold text-primary-text">04</span>
            <span aria-hidden className="h-px w-8 bg-border-strong" />
            <span className="eyebrow">For corporates & planners</span>
          </p>
          <SplitText
            as="h2"
            by="word"
            className="font-display text-display font-black uppercase"
            lines={['Planning an', 'annual day', { text: 'or conference?', node: <>or <span className="font-serif font-normal normal-case italic">conference?</span></> }]}
          />
          <p className="mt-6 max-w-lg text-lg text-fg-muted">
            One brief, multiple options, GST-ready paperwork and a manager who has run hundreds of stages. Tell us the room — we’ll shortlist the acts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Magnetic>
              <Button asChild size="lg">
                <Link href="/enquire">Plan with an expert <ArrowUpRight aria-hidden /></Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline">
              <Link href="/corporate">Corporate bookings</Link>
            </Button>
          </div>
        </div>
        <div className="relative h-[28rem] lg:col-span-5 lg:h-[40rem]" aria-hidden>
          {a && (
            <Parallax speed={0.15} className="absolute top-0 right-0 h-[70%] w-[62%] overflow-hidden rounded-2xl">
              <Image src={a.src} alt="" fill sizes="(min-width: 1024px) 25vw, 60vw" className="object-cover" />
            </Parallax>
          )}
          {b && (
            <Parallax speed={-0.12} className="absolute bottom-0 left-0 h-[55%] w-[52%] overflow-hidden rounded-2xl shadow-float">
              <Image src={b.src} alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" />
            </Parallax>
          )}
          {c && (
            <Parallax speed={0.3} className="absolute right-[8%] bottom-[6%] h-[26%] w-[30%] overflow-hidden rounded-xl border-4 border-bg">
              <Image src={c.src} alt="" fill sizes="(min-width: 1024px) 160px, 30vw" quality={60} className="object-cover" />
            </Parallax>
          )}
        </div>
      </div>
    </section>
  );
}
