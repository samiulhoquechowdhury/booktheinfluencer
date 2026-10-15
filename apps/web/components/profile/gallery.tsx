'use client';

import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import type { Image as Img } from '@repo/schemas';
import { cn } from '@repo/ui/lib/cn';
import { Reveal, RevealItem } from '@/lib/motion';

/** Editorial gallery + showreel slot. */
export function Gallery({ images, showreelUrl, name }: { images: Img[]; showreelUrl: string | null; name: string }) {
  const rest = images.slice(1);
  return (
    <Reveal stagger className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
      <RevealItem className="relative col-span-2 grid aspect-video place-items-center overflow-hidden rounded-xl border border-border bg-surface md:col-span-6">
        {showreelUrl ? (
          <iframe src={showreelUrl} title={`${name} showreel`} className="absolute inset-0 size-full" allow="encrypted-media; picture-in-picture" loading="lazy" />
        ) : (
          <>
            {rest[0] && <Image src={rest[0].src} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-40 blur-sm" />}
            <div className="relative text-center">
              <PlayCircle className="mx-auto size-14 text-fg" strokeWidth={1.25} aria-hidden />
              <p className="mt-3 font-semibold">Showreel shared on request</p>
              <p className="text-sm text-fg-muted">Your manager sends recent performance videos with the quote.</p>
            </div>
          </>
        )}
      </RevealItem>
      {rest.map((img, i) => (
        <RevealItem key={img.src} className={cn('group relative overflow-hidden rounded-xl bg-surface-2', i % 3 === 0 ? 'col-span-2 aspect-[4/5] md:col-span-3' : 'aspect-[4/5] md:col-span-3 lg:col-span-3')}>
          <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 30vw, 50vw" className="object-cover transition-transform duration-[900ms] ease-(--ease-out-expo) group-hover:scale-105" />
        </RevealItem>
      ))}
    </Reveal>
  );
}
