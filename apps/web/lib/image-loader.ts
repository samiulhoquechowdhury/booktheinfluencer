'use client';

/** next/image loader: resizes Unsplash via imgix params; passes other sources through. */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith('https://images.unsplash.com/')) {
    const url = new URL(src);
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality ?? 72));
    return url.toString();
  }
  return src;
}
