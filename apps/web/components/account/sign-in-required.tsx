'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { LoginDialog } from '@/components/shell/login-dialog';

export function SignInRequired({ area, next }: { area: 'customer' | 'talent'; next: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="shell grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-surface-2"><Lock className="size-6" aria-hidden /></span>
        <h1 className="mt-6 font-display text-h1 font-extrabold">{area === 'customer' ? 'Sign in to see your bookings' : 'Talent portal'}</h1>
        <p className="mt-3 text-fg-muted">
          {area === 'customer' ? 'Track briefs, review quotes, pay securely and download documents.' : 'Talent and representatives sign in with their invite link to see bookings and payouts.'}
        </p>
        <Button className="mt-8" size="lg" onClick={() => setOpen(true)}>Sign in</Button>
        <LoginDialog open={open} onOpenChange={setOpen} next={next} />
      </div>
    </div>
  );
}
