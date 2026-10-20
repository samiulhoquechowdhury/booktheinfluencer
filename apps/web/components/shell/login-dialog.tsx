'use client';

import { Dialog } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, Mic2, ShieldCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { SessionRole } from '@repo/schemas';
import type { Session } from '@repo/schemas';
import { REAL_API } from '@/lib/api/constants';
import { useSetSession } from '@/lib/api/hooks';
import { OtpSignIn } from './otp-sign-in';
import { useScrollLock } from '@/lib/motion';

/**
 * Sign-in. Real API: phone + one-time code. Mock mode: a demo account picker (memory.md decisions).
 */
export function LoginDialog({ open, onOpenChange, next }: { open: boolean; onOpenChange: (v: boolean) => void; next?: string }) {
  const setSession = useSetSession();
  const router = useRouter();
  useScrollLock(open);

  const signedIn = (s: Session) => {
    onOpenChange(false);
    toast.success(s.name ? `Signed in as ${s.name}` : 'Signed in');
    router.push(next ?? (s.role === 'TALENT' ? '/talent-portal' : '/account'));
    router.refresh();
  };

  const choose = (role: SessionRole) =>
    setSession.mutate(role, {
      onSuccess: (s) => {
        onOpenChange(false);
        toast.success(`Signed in as ${s.name}`);
        router.push(next ?? (role === 'TALENT' ? '/talent-portal' : '/account'));
        router.refresh();
      },
      onError: () => toast.error('Couldn’t sign in. Try again.'),
    });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                data-lenis-prevent
                className="fixed top-1/2 left-1/2 z-[96] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-bg-elevated p-6 shadow-float sm:p-8"
                initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-46%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-46%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <Dialog.Close className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Close">
                  <X className="size-4" />
                </Dialog.Close>
                {REAL_API ? (
                  <>
                <p className="eyebrow">Sign in</p>
                <Dialog.Title className="mt-2 font-display text-3xl font-extrabold tracking-tight">Welcome back</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-fg-muted">
                  We’ll text a one-time code to your mobile. New here? Your account is created when you sign in. Talent: use the number on your invite.
                </Dialog.Description>
                <OtpSignIn onSignedIn={signedIn} />
                  </>
                ) : (
                  <>
                <p className="eyebrow">Demo sign-in</p>
                <Dialog.Title className="mt-2 font-display text-3xl font-extrabold tracking-tight">Welcome back</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-fg-muted">
                  In the live product customers sign in with a one-time code on their phone, and talent use their invite link. Pick a demo account:
                </Dialog.Description>
                <div className="mt-6 grid gap-3">
                  {[
                    { role: 'CUSTOMER' as const, icon: Building2, title: 'Customer — Riya Sharma', body: 'Bookings, quotes, payments and favourites.' },
                    { role: 'TALENT' as const, icon: Mic2, title: 'Talent — Nahid Afrin Ansari', body: 'Your bookings, payouts and blackout dates.' },
                  ].map((o) => (
                    <button
                      key={o.role}
                      type="button"
                      disabled={setSession.isPending}
                      onClick={() => choose(o.role)}
                      className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-[border-color,transform] hover:border-primary-text active:scale-[0.99] disabled:opacity-60"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-primary-text transition-colors group-hover:bg-brand-gradient group-hover:text-primary-fg">
                        <o.icon className="size-5" aria-hidden />
                      </span>
                      <span>
                        <span className="block font-semibold">{o.title}</span>
                        <span className="block text-sm text-fg-muted">{o.body}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-5 flex items-center gap-2 text-xs text-fg-subtle">
                  <ShieldCheck className="size-3.5" aria-hidden /> No real data — everything on this site is mock.
                </p>
                  </>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
