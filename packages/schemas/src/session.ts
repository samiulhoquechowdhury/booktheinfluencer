import { z } from 'zod';

export const SessionRoleSchema = z.enum(['GUEST', 'CUSTOMER', 'TALENT']);
export type SessionRole = z.infer<typeof SessionRoleSchema>;

export const SessionSchema = z.object({
  role: SessionRoleSchema,
  name: z.string().nullable(),
  talentSlug: z.string().nullable(),
});
export type Session = z.infer<typeof SessionSchema>;
