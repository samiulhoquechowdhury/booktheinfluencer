import { z } from 'zod';
import { AvailabilityStatusSchema, LeadStageSchema } from './booking';
import { CategorySlugSchema, CitySlugSchema } from './catalogue';
import { IsoDateSchema, PageQuerySchema } from './common';

/** Staff pipeline inputs (srs PIPE-1..7, AVL-1..4; T-163..166). */

export const PipelineQuerySchema = PageQuerySchema.extend({
  stage: LeadStageSchema.optional(),
  /** A user id, or "unassigned". */
  ownerId: z.string().min(1).max(40).optional(),
  city: CitySlugSchema.optional(),
  category: CategorySlugSchema.optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  q: z.string().trim().min(1).max(80).optional(),
});
export type PipelineQuery = z.infer<typeof PipelineQuerySchema>;

const Note = z.string().trim().min(3).max(1000);

export const LeadTransitionSchema = z.object({
  to: LeadStageSchema,
  /** Required for LOST and CANCELLED (enforced by the state machine). */
  reason: Note.optional(),
  /** Required for EVENT_COMPLETED → SETTLEMENT. */
  completionNote: Note.optional(),
  /** OPS-5: the cancellation clause that applies (contract / policy section). */
  policyRef: z.string().trim().min(1).max(80).optional(),
  note: Note.optional(),
});
export type LeadTransition = z.infer<typeof LeadTransitionSchema>;

export const LeadNoteSchema = z.object({ text: Note });
export const LeadOwnerSchema = z.object({ ownerId: z.string().min(1).max(40).nullable() });
export const LeadBookingAddSchema = z.object({ talentSlug: z.string().trim().min(1).max(80) });

export const AvailabilityUpdateSchema = z.object({ status: AvailabilityStatusSchema, note: Note.optional() });
export const RepAcceptanceSchema = z.object({ note: Note.optional() });
