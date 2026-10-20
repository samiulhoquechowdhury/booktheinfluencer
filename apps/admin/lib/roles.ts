import type { StaffRole, StaffUser } from './types';

/** SUPER_ADMIN passes every check (mirrors the API's RolesGuard). The API enforces; this only hides UI. */
export const can = (u: Pick<StaffUser, 'roles'>, ...roles: StaffRole[]) => u.roles.includes('SUPER_ADMIN') || u.roles.some((r) => roles.includes(r));

export const WORK_LEADS: StaffRole[] = ['SALES', 'TALENT_MANAGER', 'OPS'];
export const SET_AVAILABILITY: StaffRole[] = ['SALES', 'TALENT_MANAGER'];
export const ROLE_LABELS: Record<StaffRole, string> = { SUPER_ADMIN: 'Super admin', SALES: 'Sales', TALENT_MANAGER: 'Talent manager', OPS: 'Ops', ACCOUNTS: 'Accounts' };

/** Staff-facing stage names (the customer copy lives in @repo/utils STAGE_LABELS). */
export const STAGE_NAMES = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  REQUIREMENT_RECEIVED: 'Requirement',
  SHORTLISTED: 'Shortlisted',
  AVAILABILITY_CHECK: 'Availability check',
  QUOTE_SENT: 'Quote sent',
  NEGOTIATION: 'Negotiation',
  ADVANCE_PENDING: 'Advance pending',
  CONFIRMED: 'Confirmed',
  EVENT_COMPLETED: 'Event completed',
  SETTLEMENT: 'Settlement',
  CLOSED: 'Closed',
  LOST: 'Lost',
  CANCELLED: 'Cancelled',
} as const;
