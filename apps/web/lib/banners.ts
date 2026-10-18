import type { CategorySlug } from '@repo/schemas';

export type Banner = {
  slug: CategorySlug;
  title: string;
  cta: string;
  /** Pastel matching the artwork's left edge; extends the art on wide banners. */
  tint: string;
  image: { src: string; blurDataURL: string };
};

/**
 * Category banners (artwork in public/banners, open space on the left for copy). Shared by the
 * home hero row and the talent page banner.
 */
export const BANNERS: Banner[] = [
  {
    slug: 'actors',
    title: 'Book the stars of the screen',
    cta: 'Explore actors',
    tint: '#fdeedd',
    image: { src: '/banners/actor.jpg', blurDataURL: 'data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAADQAQCdASoQAAgAA4BaJYgCdAEKbaU0kAD+9gnDd/t2f1ffvqTn4UdO/ezs1bWjYjH8d6EWgAFUXqZA0AQipcWFAAA=' },
  },
  {
    slug: 'speakers',
    title: 'Hosts who own the room',
    cta: 'Explore anchors',
    tint: '#ebe9f9',
    image: { src: '/banners/anchor.jpg', blurDataURL: 'data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAQAgCdASoQAAgAA4BaJZAC7AEQZG/jlwUAAP72B/IhD5x6nP6yXvJ0cegj/LmcnUShEbE8HTA+lmTl1XgYQjOYNmJfwGAA' },
  },
  {
    slug: 'djs',
    title: 'Keep the dance floor full',
    cta: 'Explore DJs',
    tint: '#dde0fd',
    image: { src: '/banners/dj.jpg', blurDataURL: 'data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAQAgCdASoQAAgAA4BaJZAC7AYoBt0r3AQAAP7zeeRiUABXP7HMl5P1WR0/5IIhDOTMLd6NGR/hIKgtSMyBeDnQHoMAMgAA' },
  },
  {
    slug: 'creators',
    title: 'Influencers your audience loves',
    cta: 'Explore influencers',
    tint: '#f8f6e4',
    image: { src: '/banners/influencer.jpg', blurDataURL: 'data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAAAQAgCdASoQAAgAA4BaJQBWAMUA4LLRjQwYAP73CJemTKF1Cg7f39NPTTWa5yslQPhyXe7dNUNOCZrVmLKF848oeIV15KTxavE+8mAA' },
  },
];
