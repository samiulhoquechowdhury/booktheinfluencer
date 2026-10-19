import type { User } from '@repo/db';
import type { AuthUser } from '@repo/schemas';

/** Whitelist serializer: never return password hashes, MFA secrets or timestamps. */
export const toAuthUser = (u: Pick<User, 'id' | 'name' | 'phone' | 'email' | 'roles'>): AuthUser => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  email: u.email,
  roles: u.roles,
});
