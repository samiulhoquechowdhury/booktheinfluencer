'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { StaffUser } from '@/lib/types';

const Ctx = createContext<StaffUser | null>(null);
export const UserProvider = ({ user, children }: { user: StaffUser; children: ReactNode }) => <Ctx.Provider value={user}>{children}</Ctx.Provider>;

export function useUser() {
  const u = useContext(Ctx);
  if (!u) throw new Error('useUser outside the staff layout');
  return u;
}
