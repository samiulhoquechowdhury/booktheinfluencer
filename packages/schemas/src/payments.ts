import { z } from 'zod';
import { IsoDateSchema } from './common';

/** Accounts records an offline payment (PAY-4). Exact paise, since milestones can carry paise. */
export const ManualPaymentSchema = z.object({
  amountPaise: z.string().regex(/^[1-9]\d{0,13}$/, 'Amount in paise, e.g. 15930000'),
  method: z.enum(['bank_transfer', 'upi', 'cheque', 'cash']),
  reference: z.string().trim().min(4, 'Add the UTR / cheque number').max(80),
  receivedOn: IsoDateSchema,
  note: z.string().trim().max(500).optional(),
  /** Uploaded proof, once the storage vendor is wired (T-200). */
  proofDocumentId: z.string().min(1).max(40).optional(),
});
export type ManualPayment = z.infer<typeof ManualPaymentSchema>;

/** Send the contract for e-signature (CON-2). */
export const ContractSendSchema = z.object({ includeRep: z.boolean().default(false) });
export const ContractVoidSchema = z.object({ reason: z.string().trim().min(3).max(500) });

/** Staff collections list (design.md /payments). `due` = unpaid (overdue ones first by date), `overdue` = unpaid and past due. */
export const MilestoneQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  view: z.enum(['due', 'overdue', 'paid', 'all']).default('due'),
  bookingId: z.string().min(1).max(40).optional(),
  q: z.string().trim().min(1).max(80).optional(),
});
export type MilestoneQuery = z.infer<typeof MilestoneQuerySchema>;
