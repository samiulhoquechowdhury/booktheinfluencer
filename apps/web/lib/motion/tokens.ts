/** Motion tokens — mirrored as CSS vars in packages/ui/src/styles/tokens.css. */
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4, slower: 0.7 } as const;

export const EASE = {
  /** expo.out — entrances */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** power2.inOut — transitions */
  inOut: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
} as const;

/** Interactive elements */
export const SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 1 } as const;
export const SPRING_SOFT = { type: 'spring', stiffness: 150, damping: 20, mass: 0.6 } as const;

/** GSAP equivalents */
export const GSAP_EASE = { out: 'expo.out', inOut: 'power2.inOut' } as const;

export const STAGGER = { tight: 0.04, base: 0.08, loose: 0.12 } as const;
