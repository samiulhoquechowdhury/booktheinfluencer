import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ACCESS_COOKIE } from './api/cookies';
import { staffFor } from './api/server-api';

/** The signed-in staff member for this request (middleware has already renewed the token), or a redirect to /login. */
export const requireStaff = cache(async () => {
  const user = await staffFor((await cookies()).get(ACCESS_COOKIE)?.value);
  if (!user) redirect('/login');
  return user;
});
