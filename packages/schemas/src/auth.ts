import { z } from 'zod';
import { IndianMobileSchema } from './enquiry';

/** Step 2 of phone sign-in (AUTH-1). Step 1 is `OtpRequestSchema`. */
export const OtpVerifySchema = z.object({
  phone: IndianMobileSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  /** Optional on first sign-in; used to name the new account (AUTH-4). */
  name: z.string().trim().min(2).max(80).optional(),
});
export type OtpVerify = z.infer<typeof OtpVerifySchema>;

export const OtpSentSchema = z.object({ expiresInSeconds: z.number().int(), resendInSeconds: z.number().int() });
export type OtpSent = z.infer<typeof OtpSentSchema>;

export const STAFF_ROLES = ['SUPER_ADMIN', 'SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS'] as const;
export const ROLES = [...STAFF_ROLES, 'TALENT', 'REP', 'CUSTOMER'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

/** The signed-in account as the API returns it (no secrets, no internal fields). */
export const AuthUserSchema = z.strictObject({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  roles: z.array(RoleSchema),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** Access token response; the refresh token travels only in an httpOnly cookie. */
export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  expiresInSeconds: z.number().int(),
  user: AuthUserSchema,
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

/** Staff sign-in step 1 (AUTH-2). */
export const StaffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password').max(200),
});
export type StaffLogin = z.infer<typeof StaffLoginSchema>;

/** Step 1 result: always a second factor. On first sign-in, includes the authenticator setup. */
export const StaffLoginResultSchema = z.object({
  mfaToken: z.string(),
  mfaExpiresInSeconds: z.number().int(),
  setup: z.object({ secret: z.string(), otpauthUrl: z.string() }).nullable(),
});
export type StaffLoginResult = z.infer<typeof StaffLoginResultSchema>;

/** Staff sign-in step 2: the 6-digit authenticator code. */
export const MfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app'),
});
export type MfaVerify = z.infer<typeof MfaVerifySchema>;

/** Admin creates an invite (AUTH-3). Exactly one of email / phone. Staff invites need an email. */
export const InviteCreateSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().optional(),
    phone: IndianMobileSchema.optional(),
    name: z.string().trim().min(2).max(80).optional(),
    roles: z.array(RoleSchema.exclude(['CUSTOMER'])).min(1),
    talentId: z.string().min(1).optional(),
    repId: z.string().min(1).optional(),
  })
  .refine((i) => Boolean(i.email) !== Boolean(i.phone), { path: ['email'], message: 'Give either an email or a phone number' })
  .refine((i) => !i.roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r)) || Boolean(i.email), { path: ['email'], message: 'Staff invites need an email (staff sign in with email + password)' })
  .refine((i) => !i.talentId || i.roles.includes('TALENT'), { path: ['talentId'], message: 'Only TALENT invites can be linked to a talent profile' })
  .refine((i) => !i.repId || i.roles.includes('REP'), { path: ['repId'], message: 'Only REP invites can be linked to a representative' });
export type InviteCreate = z.infer<typeof InviteCreateSchema>;

/** Accepting: email invites set a password; phone invites prove the number with an OTP code. */
export const InviteAcceptSchema = z.object({
  password: z.string().min(12, 'Use at least 12 characters').max(200).optional(),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code').optional(),
  name: z.string().trim().min(2).max(80).optional(),
});
export type InviteAccept = z.infer<typeof InviteAcceptSchema>;

export const UpdateRolesSchema = z.object({ roles: z.array(RoleSchema).min(1) });
export type UpdateRoles = z.infer<typeof UpdateRolesSchema>;
