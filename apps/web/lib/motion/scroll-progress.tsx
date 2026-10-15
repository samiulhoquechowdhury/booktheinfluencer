'use client';

import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';

/** Thin accent bar showing page scroll progress. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-brand-gradient"
      style={{ scaleX: reduce ? scrollYProgress : scaleX }}
    />
  );
}
