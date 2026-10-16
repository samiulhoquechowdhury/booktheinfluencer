'use client';

import { Dialog } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { useEffect } from 'react';
import { Button } from '@repo/ui/button';
import { formatINR } from '@repo/utils';
import { useScrollLock } from '@/lib/motion';

/** Success screen after quote acceptance — confetti + clear "what's next" (not "confirmed"). */
export function AcceptedOverlay({ open, onClose, totalPaise, talent }: { open: boolean; onClose: () => void; totalPaise: bigint; talent: string }) {
  const reduce = useReducedMotion();
  useScrollLock(open);
  useEffect(() => {
    if (!open || reduce) return;
    void import('canvas-confetti').then(({ default: confetti }) => {
      const colors = ['#8b5cf6', '#d946ef', '#e3b341', '#ffffff'];
      void confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, colors, zIndex: 120 });
      setTimeout(() => void confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0 }, colors, zIndex: 120 }), 200);
      setTimeout(() => void confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1 }, colors, zIndex: 120 }), 300);
    });
  }, [open, reduce]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-[100] bg-bg/80 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed top-1/2 left-1/2 z-[101] w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-border bg-bg-elevated p-8 text-center shadow-float"
                initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-45%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              >
                <motion.div initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }} className="mx-auto grid size-20 place-items-center rounded-full bg-brand-gradient text-primary-fg">
                  <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <motion.path d="M5 12.5 10 17.5 19 7" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.35 }} />
                  </svg>
                </motion.div>
                <Dialog.Title className="mt-6 font-display text-h1 font-extrabold">Quote accepted</Dialog.Title>
                <Dialog.Description className="mt-3 text-fg-muted">
                  <span className="tabular font-semibold text-fg">{formatINR(totalPaise)}</span> for {talent}. Next: your manager sends the contract for e-sign, then the advance payment link. We’ll confirm once the representative signs off.
                </Dialog.Description>
                <Button className="mt-8 w-full" size="lg" onClick={onClose}>Got it</Button>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
