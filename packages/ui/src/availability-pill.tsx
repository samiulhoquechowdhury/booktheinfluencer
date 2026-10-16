'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from './lib/use-reduced-motion';
import { Check } from 'lucide-react';
import { AVAILABILITY_LABELS, PENDING_AVAILABILITY, type StatusTone } from '@repo/utils';
import type { AvailabilityStatus } from '@repo/schemas';
import { cn } from './lib/cn';

const TONE: Record<StatusTone, string> = {
  neutral: 'text-neutral bg-[color-mix(in_oklab,var(--neutral)_14%,transparent)]',
  warning: 'text-warning bg-[color-mix(in_oklab,var(--warning)_14%,transparent)]',
  info: 'text-info bg-[color-mix(in_oklab,var(--info)_14%,transparent)]',
  danger: 'text-danger bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]',
  success: 'text-success bg-[color-mix(in_oklab,var(--success)_16%,transparent)]',
};

/**
 * Status pill. Pending states pulse softly; Confirmed morphs in a check.
 * Labels come from design.md §4 via @repo/utils — never invented here.
 */
export function AvailabilityPill({
  status,
  size = 'md',
  className,
}: {
  status: AvailabilityStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { label, tone } = AVAILABILITY_LABELS[status];
  const pending = PENDING_AVAILABILITY.has(status);
  const reduce = useReducedMotion();
  return (
    <motion.span
      layout={!reduce}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors duration-(--duration-slow)',
        size === 'sm' ? 'px-2 py-0.5 text-[0.6875rem]' : 'px-2.5 py-1 text-xs',
        TONE[tone],
        className,
      )}
    >
      <span className="relative grid size-3.5 place-items-center" aria-hidden>
        <AnimatePresence mode="popLayout" initial={false}>
          {status === 'CONFIRMED' ? (
            <motion.span
              key="check"
              initial={reduce ? false : { scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              className="grid size-3.5 place-items-center rounded-full bg-success text-bg"
            >
              <Check className="size-2.5" strokeWidth={3.5} />
            </motion.span>
          ) : (
            <motion.span
              key="dot"
              initial={false}
              exit={{ scale: 0 }}
              className="relative size-1.5 rounded-full bg-current"
            >
              {pending && (
                <span className="absolute inset-0 rounded-full bg-current motion-safe:animate-pulse-soft" />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <motion.span layout={!reduce ? 'position' : false}>{label}</motion.span>
    </motion.span>
  );
}
