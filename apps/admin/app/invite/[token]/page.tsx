import type { Metadata } from 'next';
import { AcceptInvite } from './accept-invite';

export const metadata: Metadata = { title: 'Accept invite' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-sm font-extrabold tracking-tight text-primary-text">BookTheInfluencer</p>
        <AcceptInvite token={(await params).token} />
      </div>
    </main>
  );
}
