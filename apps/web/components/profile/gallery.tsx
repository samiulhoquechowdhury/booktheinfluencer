'use client';

import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import type { Image as Img } from '@repo/schemas';
import { cn } from '@repo/ui/lib/cn';

/** Photo grid (cover excluded; it's in the hero) plus the showreel, or a note that it comes with the quote. */
export function Gallery({ images, showreelUrl, name }: { images: Img[]; showreelUrl: string | null; name: string }) {
  const rest = images.slice(1);
  return (
    <div className="space-y-3">
      {showreelUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-surface">
          <iframe src={showreelUrl} title={`${name} showreel`} className="absolute inset-0 size-full" allow="encrypted-media; picture-in-picture" loading="lazy" />
        </div>
      ) : null}
      <ul className={cn('grid grid-cols-2 gap-3', rest.length % 4 === 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
        {rest.map((img) => (
          <li key={img.src} className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-surface-2">
            <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 260px, (min-width: 640px) 30vw, 50vw" className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105" />
          </li>
        ))}
      </ul>
      {!showreelUrl && (
        <p className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
          <PlayCircle className="size-5 shrink-0 text-primary-text" aria-hidden />
          <span><span className="font-semibold">Showreel on request.</span> <span className="text-fg-muted">Your manager sends recent performance videos with the quote.</span></span>
        </p>
      )}
    </div>
  );
}
