import type { TalentQuery } from '@repo/schemas';

export const qk = {
  session: ['session'] as const,
  talents: (q: TalentQuery) => ['talents', q] as const,
  talent: (slug: string) => ['talent', slug] as const,
  similar: (slug: string) => ['talent', slug, 'similar'] as const,
  favourites: ['me', 'favourites'] as const,
  dashboard: ['me', 'bookings'] as const,
  booking: (ref: string) => ['me', 'bookings', ref] as const,
  portal: ['portal'] as const,
  portalBookings: ['portal', 'bookings'] as const,
  payouts: ['portal', 'payouts'] as const,
  blackouts: ['portal', 'blackouts'] as const,
};
