import { z } from 'zod';
import { LineItemTypeSchema } from './booking';
import { IsoDateSchema } from './common';

/**
 * Staff quote builder inputs (srs QUO-1..6, T-180..182). Amounts are whole rupees, stored as paise.
 * `internalCostRupees` / `payoutRupees` may only be sent by roles allowed to see them (trd §7);
 * omitted, they keep the line's current value (matched by `id`), or 0 / not entered for new lines.
 */
const Rupees = z.number().int().min(0).max(100_000_000);

export const QuoteLineInputSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  type: LineItemTypeSchema,
  description: z.string().trim().min(2).max(200),
  amountRupees: Rupees.refine((n) => n > 0, 'Enter the customer amount'),
  internalCostRupees: Rupees.optional(),
  payoutRupees: Rupees.nullable().optional(),
});
export type QuoteLineInput = z.infer<typeof QuoteLineInputSchema>;

export const QuoteMilestoneInputSchema = z.object({
  label: z.string().trim().min(2).max(60),
  percentBps: z.number().int().min(1).max(10_000),
  dueDate: IsoDateSchema,
});

export const QuoteInputSchema = z
  .object({
    validUntil: IsoDateSchema,
    gstBps: z.number().int().min(0).max(2800).default(1800),
    lines: z.array(QuoteLineInputSchema).min(1).max(30),
    milestones: z.array(QuoteMilestoneInputSchema).min(1).max(6),
    inclusions: z.array(z.string().trim().min(2).max(200)).max(20).default([]),
    notes: z.string().trim().max(2000).nullable().default(null),
  })
  .refine((q) => q.milestones.reduce((a, m) => a + m.percentBps, 0) === 10_000, { path: ['milestones'], message: 'Milestones must add up to 100%' })
  .refine((q) => q.milestones.every((m, i, all) => i === 0 || m.dueDate >= all[i - 1]!.dueDate), { path: ['milestones'], message: 'Milestone due dates must be in order' })
  .refine((q) => q.lines.some((l) => l.type === 'TALENT_FEE'), { path: ['lines'], message: 'Add the talent fee line' });
export type QuoteInput = z.infer<typeof QuoteInputSchema>;

export const QuoteApprovalSchema = z.object({ note: z.string().trim().min(3).max(500).optional() });

/** Staff edits to the brief after the enquiry (the form doesn't collect a start time). */
export const LeadBriefUpdateSchema = z.object({ startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM').nullable() });
