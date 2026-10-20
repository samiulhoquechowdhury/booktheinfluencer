import { z } from 'zod';

/**
 * Admin environment (trd §11), validated via next.config.ts when the server starts (`next dev` /
 * `next start`). Skipped during `next build`, which never calls the API, so CI can build the app
 * without pointing the whole job at an API (that would switch apps/web's catalogue too).
 */
const schema = z.object({
  /** NestJS API origin. Required at runtime: the admin app has no mock mode. */
  API_URL: z.url(),
});

const building = process.env.NEXT_PHASE === 'phase-production-build';
const parsed = schema.safeParse({ API_URL: process.env.API_URL || undefined });
if (!parsed.success && !building && typeof window === 'undefined') {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables for apps/admin:\n${issues}\nSee apps/admin/.env.example.`);
}

export const env = (parsed.success ? parsed.data : { API_URL: '' }) as z.infer<typeof schema>;
