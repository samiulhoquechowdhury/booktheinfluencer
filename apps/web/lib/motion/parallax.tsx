'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { useRef, type ReactNode } from 'react';

/** Vertical parallax. speed > 0 moves slower than scroll; < 0 moves against it. */
export function Parallax({ children, speed = 0.2, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}
