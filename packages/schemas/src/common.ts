import { z } from 'zod';

/** Money on the wire: integer paise as a decimal string (BigInt-safe), parsed to bigint. */
export const PaiseSchema = z
  .union([z.string().regex(/^-?\d+$/), z.bigint(), z.number().int()])
  .transform((v) => BigInt(v));
export type Paise = bigint;

/** Percent in basis points (1% = 100). */
export const BpsSchema = z.number().int().min(0).max(10_000);

/** ISO-8601 timestamp (UTC on the wire; displayed in IST). */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
/** Calendar date YYYY-MM-DD (event dates, blackouts). */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ImageSchema = z.object({
  src: z.string().url(),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Tiny inline preview shown while the real image loads (covers only). */
  blurDataURL: z.string().startsWith('data:image/').max(2000).optional(),
});
export type Image = z.infer<typeof ImageSchema>;

export const PageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
