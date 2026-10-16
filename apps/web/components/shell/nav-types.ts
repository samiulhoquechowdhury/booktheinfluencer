import type { CategorySlug } from '@repo/schemas';

/** Data the header needs (computed server-side so images/counts track the catalogue). */
export type NavData = {
  total: number;
  categories: {
    slug: CategorySlug;
    name: string;
    blurb: string;
    count: number;
    image: { src: string; blurDataURL?: string };
  }[];
  featured: { slug: string; name: string; role: string; city: string; image: { src: string; alt: string; blurDataURL?: string } } | null;
};
