import type { Category, CategorySlug, City, CitySlug } from '@repo/schemas';

/** Static reference data (would come from /v1/categories later). */
export const CATEGORIES: readonly Category[] = [
  { slug: 'actors', name: 'Actors & celebrities', singular: 'Actor', description: 'Film and television stars for brand campaigns, launches, award nights and appearances.' },
  { slug: 'singers', name: 'Singers', singular: 'Singer', description: 'Live vocalists for weddings, annual days and concerts — from ghazal to Bollywood to regional folk.' },
  { slug: 'djs', name: 'DJs', singular: 'DJ', description: 'Open-format, Bollywood-house and club DJs who read the room and keep floors full.' },
  { slug: 'comedians', name: 'Comedians', singular: 'Comedian', description: 'Clean, bilingual stand-up for corporate rooms, campuses and private celebrations.' },
  { slug: 'speakers', name: 'Speakers & anchors', singular: 'Speaker', description: 'Keynote speakers and emcees who keep agendas tight and audiences engaged.' },
  { slug: 'creators', name: 'Creators', singular: 'Creator', description: 'Creators for launches, campus campaigns and brand storytelling.' },
];

export const CITIES: readonly City[] = [
  { slug: 'guwahati', name: 'Guwahati', state: 'Assam' },
  { slug: 'shillong', name: 'Shillong', state: 'Meghalaya' },
  { slug: 'kolkata', name: 'Kolkata', state: 'West Bengal' },
  { slug: 'delhi', name: 'Delhi', state: 'Delhi NCR' },
  { slug: 'mumbai', name: 'Mumbai', state: 'Maharashtra' },
  { slug: 'bengaluru', name: 'Bengaluru', state: 'Karnataka' },
  { slug: 'hyderabad', name: 'Hyderabad', state: 'Telangana' },
  { slug: 'pune', name: 'Pune', state: 'Maharashtra' },
];

export const categoryBySlug = (slug: string): Category | undefined => CATEGORIES.find((c) => c.slug === slug);
export const cityBySlug = (slug: string): City | undefined => CITIES.find((c) => c.slug === slug);
export const cityName = (slug: CitySlug) => cityBySlug(slug)?.name ?? slug;
export const categoryName = (slug: CategorySlug) => categoryBySlug(slug)?.name ?? slug;
export const categorySingular = (slug: CategorySlug) => categoryBySlug(slug)?.singular ?? slug;

export const BUDGET_OPTIONS = [
  { value: 'under_1l', label: 'Under ₹1L' },
  { value: '1l_3l', label: '₹1L – ₹3L' },
  { value: '3l_10l', label: '₹3L – ₹10L' },
  { value: 'above_10l', label: '₹10L +' },
] as const;
