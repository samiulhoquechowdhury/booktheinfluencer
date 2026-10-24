import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getSessionApi } from '@/lib/api/server';
import { SignInRequired } from '@/components/account/sign-in-required';
import { CustomerShell } from '@/components/account/customer-shell';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

/** Hides the UI for non-customers. The API enforces the same rule independently. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const { role } = await getSessionApi();
  if (role !== 'CUSTOMER') return <SignInRequired area="customer" next="/account" />;
  return (
    <div className="shell">
      <CustomerShell>{children}</CustomerShell>
    </div>
  );
}
