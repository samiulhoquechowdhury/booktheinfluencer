'use client';

import { useReducedMotion as useMotionReduced } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * Hydration-safe reduced-motion flag. The server can't know the user's preference, so this
 * returns `false` for the first (hydrating) render and the real value after mount — markup that
 * branches on it never mismatches. Global CSS already neutralises animations meanwhile.
 */
export function useReducedMotion(): boolean {
  const prefers = useMotionReduced();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? !!prefers : false;
}
