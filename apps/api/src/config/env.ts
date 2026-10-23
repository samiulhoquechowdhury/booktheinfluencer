import { z } from 'zod';

/** API environment, validated at boot (trd §11). The process exits on a bad value. */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url().refine((u) => u.startsWith('postgres'), 'Must be a postgres:// URL'),
  REDIS_URL: z.url().refine((u) => u.startsWith('redis'), 'Must be a redis:// URL'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Signs 15-minute access tokens (HS256). */
  JWT_ACCESS_SECRET: z.string().min(32, 'Use at least 32 characters'),
  /** HMAC key for OTP codes and refresh-token hashes. Keep different from JWT_ACCESS_SECRET. */
  AUTH_SECRET: z.string().min(32, 'Use at least 32 characters'),
  /** AES-256-GCM key for MFA secrets at rest: 32 random bytes, base64 (openssl rand -base64 32). */
  MFA_ENCRYPTION_KEY: z.string().refine((k) => Buffer.from(k, 'base64').length === 32, 'Must be 32 bytes, base64-encoded'),
  /** Website page that accepts talent / rep invite links; the token is appended (AUTH-3). */
  INVITE_BASE_URL: z.url().default('http://localhost:3000/invite'),
  /** Staff invites open the admin app instead (staff set a password there, then sign in with MFA). */
  STAFF_INVITE_BASE_URL: z.url().default('http://localhost:3001/invite'),
  /** SMS adapter for OTPs. `console` logs codes instead of sending them (development/test only). */
  SMS_PROVIDER: z.enum(['console']).default('console'),
  /** DEMO ONLY (development): accept any 6-digit OTP so testers can sign in without the console code. Refused in production; remove before launch. */
  OTP_ACCEPT_ANY: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  /** Payment gateway adapter. `fake` = local test gateway (development/test only) until the vendor is chosen. */
  PAYMENT_PROVIDER: z.enum(['fake']).default('fake'),
  /** HMAC-SHA256 key the gateway signs webhooks with. */
  PAYMENT_WEBHOOK_SECRET: z.string().min(32, 'Use at least 32 characters'),
  /** E-sign adapter. `fake` = local test provider (development/test only). */
  ESIGN_PROVIDER: z.enum(['fake']).default('fake'),
  ESIGN_WEBHOOK_SECRET: z.string().min(32, 'Use at least 32 characters'),
  /** trd §13: the website's on-demand revalidation endpoint (…/api/revalidate) and its shared secret. Optional. */
  WEB_REVALIDATE_URL: z.url().optional(),
  REVALIDATE_SECRET: z.string().min(32, 'Use at least 32 characters').optional(),
  /** Customer site; the fake gateway's checkout links point here. */
  WEB_BASE_URL: z.url().default('http://localhost:3000'),
  /** QUO-6: quotes with a margin below this (basis points of the pre-tax subtotal) need SUPER_ADMIN approval. Placeholder until the client sets it (memory.md open questions). */
  QUOTE_MARGIN_FLOOR_BPS: z.coerce.number().int().min(0).max(10_000).default(1000),
  /** Booking desk number shown to customers when their lead owner has no phone on file. */
  SUPPORT_PHONE: z.string().regex(/^\+91[6-9]\d{9}$/, 'E.164 Indian mobile, e.g. +919876543210').optional(),
})
  .refine((e) => e.NODE_ENV !== 'production' || e.SMS_PROVIDER !== 'console', { path: ['SMS_PROVIDER'], message: 'Configure a real SMS provider in production' })
  .refine((e) => e.NODE_ENV !== 'production' || !e.OTP_ACCEPT_ANY, { path: ['OTP_ACCEPT_ANY'], message: 'Demo OTP bypass must be off in production' })
  .refine((e) => e.NODE_ENV !== 'production' || e.PAYMENT_PROVIDER !== 'fake', { path: ['PAYMENT_PROVIDER'], message: 'Configure a real payment gateway in production' })
  .refine((e) => e.NODE_ENV !== 'production' || e.ESIGN_PROVIDER !== 'fake', { path: ['ESIGN_PROVIDER'], message: 'Configure a real e-sign provider in production' })
  .refine((e) => e.PAYMENT_WEBHOOK_SECRET !== e.ESIGN_WEBHOOK_SECRET, { path: ['ESIGN_WEBHOOK_SECRET'], message: 'Must differ from PAYMENT_WEBHOOK_SECRET' })
  .refine((e) => e.NODE_ENV !== 'production' || e.SUPPORT_PHONE, { path: ['SUPPORT_PHONE'], message: 'Set the booking desk number in production' })
  .refine((e) => e.JWT_ACCESS_SECRET !== e.AUTH_SECRET, { path: ['AUTH_SECRET'], message: 'Must differ from JWT_ACCESS_SECRET' });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables for apps/api:\n${issues}\nSee apps/api/.env.example.`);
  }
  return parsed.data;
}

/** DI token for the validated config. */
export const ENV = Symbol('ENV');
