import { z } from 'zod';

/**
 * Environment variables, validated once at boot (trd §11). next.config.ts imports this file, so a
 * bad value fails `next dev` / `next build` immediately instead of breaking pages at runtime.
 * NEXT_PUBLIC_* values are read with literal `process.env.X` so Next can inline them for the browser.
 */
const isProd = process.env.NODE_ENV === 'production';

const schema = z.object({
  /** Canonical site origin for metadata, sitemap and JSON-LD. Required in production. */
  NEXT_PUBLIC_SITE_URL: isProd ? z.url() : z.url().default('http://localhost:3000'),
  /** Where the browser sends API calls. `/api/mock` (default) is the built-in mock API. */
  NEXT_PUBLIC_API_BASE: z.string().regex(/^(\/|https?:\/\/)/, 'Must be a path starting with / or an http(s) URL').default('/api/mock'),
  /** Server-side API origin once the NestJS API exists (unused while on the mock API). */
  API_URL: z.url().optional(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || undefined,
  API_URL: process.env.API_URL || undefined,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables for apps/web:\n${issues}\nSee apps/web/.env.example.`);
}

export const env = parsed.data;
