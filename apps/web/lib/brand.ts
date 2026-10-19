import { env } from './env';

/** Brand identity. Change here only. */
export const BRAND = {
  name: 'BookTheInfluencer',
  wordmark: 'BookTheInfluencer',
  tagline: 'Verified talent, managed end to end.',
  url: env.NEXT_PUBLIC_SITE_URL,
  supportPhone: '+91 98640 12345',
  whatsapp: '919864012345',
  email: 'hello@example.com',
} as const;
