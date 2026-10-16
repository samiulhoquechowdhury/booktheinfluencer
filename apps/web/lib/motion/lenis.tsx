'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';

/**
 * Global smooth scroll. Runs on its own rAF until GSAP loads, then hands its clock to
 * gsap.ticker (see gsap.ts) so ScrollTrigger and Lenis stay in lockstep.
 * Off under reduced motion. Use `useScrollLock(open)` in modals/sheets.
 */
type Ctx = { lenis: Lenis | null };
const LenisContext = createContext<Ctx>({ lenis: null });

let singleton: Lenis | null = null;
let rafId = 0;
let lockCount = 0;
export const getLenis = () => singleton;
export const stopOwnRaf = () => cancelAnimationFrame(rafId);

export function LenisProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (reduce) return;
    const l = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    singleton = l;
    setLenis(l);
    const raf = (time: number) => {
      l.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      l.destroy();
      singleton = null;
      setLenis(null);
    };
  }, [reduce]);

  // New route → start at top instantly (Next handles native scroll; Lenis must agree).
  useEffect(() => {
    if (!window.location.hash) lenis?.scrollTo(0, { immediate: true, force: true });
  }, [pathname, lenis]);

  return <LenisContext.Provider value={{ lenis }}>{children}</LenisContext.Provider>;
}

export const useLenis = () => useContext(LenisContext).lenis;

/** Pause smooth scroll while an overlay is open (ref-counted for nested overlays). */
export function useScrollLock(open: boolean) {
  const lenis = useLenis();
  const held = useRef(false);
  useEffect(() => {
    if (!lenis) return;
    if (open && !held.current) {
      held.current = true;
      lockCount += 1;
      lenis.stop();
    }
    if (!open && held.current) {
      held.current = false;
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) lenis.start();
    }
    return () => {
      if (held.current) {
        held.current = false;
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) lenis.start();
      }
    };
  }, [open, lenis]);
}
