'use client';

/**
 * next/image loader. Unsplash (imgix) resizes and serves AVIF/WebP via `auto=format`, so we skip
 * Next's optimiser entirely. Width snaps to our breakpoints; quality defaults to 70.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith('https://images.unsplash.com/')) {
    const url = new URL(src);
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality ?? 70));
    if (!url.searchParams.has('auto')) url.searchParams.set('auto', 'format');
    return url.toString();
  }
  return src;
}
