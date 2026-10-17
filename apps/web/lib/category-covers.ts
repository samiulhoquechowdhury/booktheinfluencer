import type { PublicTalent } from '@repo/schemas';

/** Hand-picked category covers; other categories fall back to their first artist's photo. */
const COVERS: Record<string, { src: string; blurDataURL?: string }> = {
  singers: {
    src: '/categories/singers.jpg',
    blurDataURL: 'data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAADwAQCdASoIAAoAA4BaJZACdAEPBbTYmJAA/vNQ5UW8ZKKbpf+qYtbXwuf9KU4cVZZYS0M6qdWTUUD/44PrAAAA',
  },
  djs: {
    src: '/categories/djs.jpg',
    blurDataURL: 'data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAoAA4BaJbACdAEfaxDfIAD+9dyL83J/plaVXv2gNy+hqeHabiETNo7wQJFBQMtCwgrsbkSZ2Rhrz4CCwzrxoJINUTCuYAA=',
  },
  creators: {
    src: '/categories/creators.jpg',
    blurDataURL: 'data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADQAQCdASoIAAoAA4BaJQBOgB5u1jdjAAD9uLpSkvBB0jDOdnDyjzN6mAH/DuqnMckhODkEA2QazXxCgJQgEMwt/Wl5gogAAAA=',
  },
};

/** One cover per category, shared by the navbar Talent menu and the home page category list. */
export function categoryCover(slug: string, inCategory: PublicTalent[]): { src: string; blurDataURL?: string } {
  const first = inCategory[0]?.images[0];
  return COVERS[slug] ?? { src: first?.src ?? '', blurDataURL: first?.blurDataURL };
}
