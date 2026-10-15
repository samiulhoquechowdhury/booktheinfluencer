'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { PublicTalent } from '@repo/schemas';
import { cn } from '@repo/ui/lib/cn';
import { useFavourites, useSession, useToggleFavourite } from '@/lib/api/hooks';
import { LoginDialog } from '@/components/shell/login-dialog';

const PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { x: Math.cos(a) * 26, y: Math.sin(a) * 26, s: i % 2 ? 4 : 6 };
});

/** Heart with particle burst, optimistic update and toast. Guests are asked to sign in. */
export function FavouriteButton({ talent, className, size = 'md' }: { talent: PublicTalent; className?: string; size?: 'md' | 'lg' }) {
  const { data: session } = useSession();
  const isCustomer = session?.role === 'CUSTOMER';
  const favs = useFavourites(isCustomer);
  const toggle = useToggleFavourite();
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const on = !!favs.data?.some((t) => t.slug === talent.slug);

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? `Remove ${talent.name} from favourites` : `Save ${talent.name} to favourites`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!session || session.role === 'GUEST') {
            setLoginOpen(true);
            return;
          }
          if (!isCustomer) {
            toast('Favourites are for customer accounts.');
            return;
          }
          if (!on) setBurst((b) => b + 1);
          toggle.mutate({ talent, on: !on });
        }}
        className={cn(
          'glass relative grid place-items-center rounded-full transition-transform active:scale-90',
          size === 'md' ? 'size-10' : 'size-12',
          className,
        )}
      >
        <motion.span animate={on && !reduce ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <Heart className={cn('size-[18px] transition-colors', on ? 'fill-accent text-accent' : 'text-fg')} aria-hidden />
        </motion.span>
        <AnimatePresence>
          {!reduce && burst > 0 && (
            <motion.span key={burst} className="pointer-events-none absolute inset-0" aria-hidden initial="a" animate="b" exit={{ opacity: 0 }}>
              {PARTICLES.map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute top-1/2 left-1/2 rounded-full bg-brand-gradient"
                  style={{ width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
                  variants={{ a: { x: 0, y: 0, opacity: 1, scale: 1 }, b: { x: p.x, y: p.y, opacity: 0, scale: 0.4 } }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-accent"
                variants={{ a: { scale: 0.6, opacity: 1 }, b: { scale: 1.6, opacity: 0 } }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} next={typeof window !== 'undefined' ? window.location.pathname : undefined} />
    </>
  );
}
