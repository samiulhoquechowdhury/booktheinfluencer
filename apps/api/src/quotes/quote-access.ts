import type { Role } from '@repo/db';
import type { AuthUserRef } from '../auth/guards';

/** trd §7 field visibility for staff. SUPER_ADMIN sees everything. */
const has = (u: Pick<AuthUserRef, 'roles'>, roles: readonly Role[]) => u.roles.includes('SUPER_ADMIN') || u.roles.some((r) => roles.includes(r));

/** Talent payout: talent managers and finance. */
export const seesPayout = (u: Pick<AuthUserRef, 'roles'>) => has(u, ['TALENT_MANAGER', 'ACCOUNTS']);
/** Internal cost and margin: finance only. */
export const seesFinance = (u: Pick<AuthUserRef, 'roles'>) => has(u, ['ACCOUNTS']);

/** Quote validity runs to the end of the chosen day, IST. */
export const endOfDayIST = (isoDate: string) => new Date(`${isoDate}T23:59:59.999+05:30`);
export const todayIST = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
