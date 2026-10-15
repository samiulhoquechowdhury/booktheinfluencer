'use client';

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@repo/ui/lib/cn';

/**
 * Infinite marquee. Pauses on hover/focus; speed reacts to scroll velocity (and flips direction
 * when scrolling up). Reduced motion → static, wrapping row.
 */
export function Marquee({
  children,
  speed = 40,
  reverse = false,
  className,
  label,
}: {
  children: ReactNode;
  /** px per second */
  speed?: number;
  reverse?: boolean;
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const hover = useRef(false);
  const factor = useRef(1);

  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.scrollWidth / 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (reduce || !width) return;
    const target = hover.current ? 0 : 1;
    factor.current += (target - factor.current) * 0.08; // ease to pause
    const b = boost.get();
    const dir = (reverse ? -1 : 1) * (b < -0.05 ? -1 : 1);
    const moveBy = dir * speed * (delta / 1000) * factor.current * (1 + Math.abs(b));
    let next = x.get() - moveBy;
    if (next <= -width) next += width;
    if (next > 0) next -= width;
    x.set(next);
  });

  if (reduce) {
    return (
      <div className={cn('overflow-hidden', className)} aria-label={label}>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-hidden', className)}
      onPointerEnter={() => (hover.current = true)}
      onPointerLeave={() => (hover.current = false)}
      onFocusCapture={() => (hover.current = true)}
      onBlurCapture={() => (hover.current = false)}
      role={label ? 'marquee' : undefined}
      aria-label={label}
    >
      <motion.div ref={track} style={{ x }} className="flex w-max will-change-transform">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
