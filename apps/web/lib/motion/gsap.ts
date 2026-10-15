'use client';

import { getLenis, stopOwnRaf } from './lenis';

/**
 * Lazy GSAP + ScrollTrigger. Only scroll-story sections call this, so GSAP never lands in the
 * bundle of pages that don't need it. On first load, Lenis is re-clocked onto gsap.ticker.
 */
type GsapBundle = { gsap: typeof import('gsap').gsap; ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger };
let promise: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  if (!promise) {
    promise = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, st]) => {
      const gsap = g.gsap;
      const ScrollTrigger = st.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      gsap.defaults({ ease: 'expo.out', duration: 0.7 });
      const lenis = getLenis();
      if (lenis) {
        stopOwnRaf();
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }
      return { gsap, ScrollTrigger };
    });
  }
  return promise;
}
