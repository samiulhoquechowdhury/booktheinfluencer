'use client';

import { motion, type Variants } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import type { ReactNode } from 'react';
import { DURATION, EASE, STAGGER } from './tokens';

const HIDDEN = { opacity: 0, y: 28, filter: 'blur(8px)' };
const SHOWN = { opacity: 1, y: 0, filter: 'blur(0px)' };
const item: Variants = {
  hidden: HIDDEN,
  show: { ...SHOWN, transition: { duration: DURATION.slower, ease: EASE.out } },
};

type Tag = 'div' | 'section' | 'ul' | 'ol' | 'li' | 'header' | 'p' | 'span' | 'article';

/**
 * Fade + rise + blur-in on view. With `stagger`, direct <RevealItem> children cascade.
 * Reduced motion → rendered static.
 */
export function Reveal({
  children,
  as = 'div',
  className,
  stagger,
  delay = 0,
  amount = 0.25,
  once = true,
}: {
  children: ReactNode;
  as?: Tag;
  className?: string;
  stagger?: number | boolean;
  delay?: number;
  amount?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }
  const staggerChildren = stagger === true ? STAGGER.base : stagger || 0;
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={
        staggerChildren
          ? { hidden: {}, show: { transition: { staggerChildren, delayChildren: delay } } }
          : { hidden: HIDDEN, show: { ...SHOWN, transition: { duration: DURATION.slower, ease: EASE.out, delay } } }
      }
    >
      {children}
    </Comp>
  );
}

export function RevealItem({ children, as = 'div', className }: { children: ReactNode; as?: Tag; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }
  const Comp = motion[as];
  return (
    <Comp className={className} variants={item}>
      {children}
    </Comp>
  );
}
