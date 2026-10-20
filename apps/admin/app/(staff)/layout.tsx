import type { ReactNode } from 'react';
import { Shell } from '@/components/shell';
import { requireStaff } from '@/lib/session';

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requireStaff();
  return <Shell user={user}>{children}</Shell>;
}
