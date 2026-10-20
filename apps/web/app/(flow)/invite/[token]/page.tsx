import type { Metadata } from 'next';
import { AcceptInvite } from '@/components/account/accept-invite';

export const metadata: Metadata = { title: 'Accept your invite', robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div className="shell max-w-md">
      <AcceptInvite token={(await params).token} />
    </div>
  );
}
