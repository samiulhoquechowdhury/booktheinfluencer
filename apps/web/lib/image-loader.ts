'use client';

/** Thumbnail widths Wikimedia pre-renders; other widths are throttled by its CDN. */
const COMMONS_WIDTHS = [120, 250, 330, 500, 960, 1280, 1920];
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/';

/**
 * next/image loader. Unsplash (imgix) resizes and serves AVIF/WebP via `auto=format`, so we skip
 * Next's optimiser entirely. Width snaps to our breakpoints; quality defaults to 70.
 * Wikimedia Commons originals map to their `/thumb/` URL at the nearest standard width; the
 * original's width travels as `#w=` so we never ask Commons to upscale (it refuses).
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith('https://images.unsplash.com/')) {
    const url = new URL(src);
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality ?? 70));
    if (!url.searchParams.has('auto')) url.searchParams.set('auto', 'format');
    return url.toString();
  }
  if (src.startsWith(COMMONS)) {
    const [path, hash = ''] = src.slice(COMMONS.length).split('#');
    const original = Number(new URLSearchParams(hash).get('w')) || Infinity;
    const target = COMMONS_WIDTHS.find((w) => w >= width) ?? COMMONS_WIDTHS.at(-1)!;
    if (target >= original) return `${COMMONS}${path}?w=${width}`;
    const file = path!.split('/').pop()!;
    return `${COMMONS}thumb/${path}/${target}px-${file}`;
  }
  return src;
}
