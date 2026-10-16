'use client';

import { motion } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { EASE } from './tokens';

/**
 * Route transitions.
 * 1. Shared element: `navigateWithMorph(href)` wraps the route change in the View Transitions
 *    API so an element with the same `view-transition-name` (card image → profile hero) morphs.
 * 2. Fallback: <Curtain/> wipes off on route entry (marketing templates).
 */
type Ctx = { navigateWithMorph: (href: string) => void; morphing: React.RefObject<boolean> };
const TransitionContext = createContext<Ctx | null>(null);

type DocWithVT = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const resolver = useRef<(() => void) | null>(null);
  const morphing = useRef(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (resolver.current) {
      const done = resolver.current;
      resolver.current = null;
      requestAnimationFrame(() => done());
    }
  }, [pathname]);

  const navigateWithMorph = useCallback(
    (href: string) => {
      const doc = document as DocWithVT;
      if (reduce || !doc.startViewTransition) {
        router.push(href);
        return;
      }
      morphing.current = true;
      const vt = doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            resolver.current = resolve;
            router.push(href);
            setTimeout(() => {
              if (resolver.current === resolve) {
                resolver.current = null;
                resolve();
              }
            }, 2500);
          }),
      );
      void vt.finished.finally(() => {
        morphing.current = false;
      });
    },
    [router, reduce],
  );

  return <TransitionContext.Provider value={{ navigateWithMorph, morphing }}>{children}</TransitionContext.Provider>;
}

export function usePageTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error('usePageTransition must be used inside <TransitionProvider>');
  return ctx;
}

/** True until the first client render completes — the curtain never covers SSR/first paint. */
let firstLoad = true;

/** Entry curtain: a brand panel sweeps up off the new page. Client navigations only; skipped during a morph. */
export function Curtain() {
  const reduce = useReducedMotion();
  const ctx = useContext(TransitionContext);
  const [show] = useState(() => !firstLoad && !ctx?.morphing.current);
  useEffect(() => {
    firstLoad = false;
  }, []);
  if (reduce || !show) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[85] origin-top bg-brand-gradient"
      initial={{ scaleY: 1 }}
      animate={{ scaleY: 0 }}
      transition={{ duration: 0.7, ease: EASE.inOut, delay: 0.05 }}
    />
  );
}

/** Content fade for app screens (lighter than the curtain). */
export function FadeIn({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE.out }}>
      {children}
    </motion.div>
  );
}
