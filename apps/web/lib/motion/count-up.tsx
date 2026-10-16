'use client';

import { animate, useInView } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { useEffect, useRef, useState } from 'react';
import { formatINR } from '@repo/utils';

type Format = 'number' | 'inr' | 'percent';

const fmt = (n: number, format: Format, decimals: number) => {
  if (format === 'inr') return formatINR(BigInt(Math.round(n)) * 100n);
  const v = new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
  return format === 'percent' ? `${v}%` : v;
};

/**
 * Animates a number when scrolled into view. `inr` takes whole RUPEES for display only
 * (callers convert from paise with paiseToDisplayRupees) — the source of truth stays bigint.
 */
export function CountUp({
  value,
  format = 'number',
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.4,
  from = 0,
  className,
}: {
  value: number;
  format?: Format;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  from?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(() => fmt(reduce ? value : from, format, decimals));

  useEffect(() => {
    if (reduce) {
      setDisplay(fmt(value, format, decimals));
      return;
    }
    if (!inView) return;
    const ctrl = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(fmt(v, format, decimals)),
    });
    return () => ctrl.stop();
  }, [inView, value, from, duration, format, decimals, reduce]);

  return (
    <span ref={ref} className={className ? `tabular ${className}` : 'tabular'}>
      <span aria-hidden>
        {prefix}
        {display}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {fmt(value, format, decimals)}
        {suffix}
      </span>
    </span>
  );
}
