import type { Metadata } from 'next';
import { SignInRequired } from '@/components/account/sign-in-required';
import { PortalView } from '@/components/portal/portal-view';
import { getSessionApi } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Talent portal', robots: { index: false } };

export default async function TalentPortalPage() {
  const { role } = await getSessionApi();
  if (role !== 'TALENT') return <SignInRequired area="talent" next="/talent-portal" />;
  return (
    <div className="shell">
      <PortalView />
    </div>
  );
}
