'use client';

import { motion } from 'motion/react';
import { useReducedMotion } from './lib/use-reduced-motion';
import { Check, X } from 'lucide-react';
import { TIMELINE_LABELS, type StepState, type TimelineStep } from '@repo/utils';
import { cn } from './lib/cn';

/** Vertical status steps: Brief → Availability → Quote → Contract → Advance → Confirmed → Event → Completed. */
export function StatusTimeline({
  steps,
  hints = {},
  className,
}: {
  steps: { step: TimelineStep; state: StepState }[];
  hints?: Partial<Record<TimelineStep, string>>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <ol className={cn('relative', className)} aria-label="Booking progress">
      {steps.map(({ step, state }, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0" aria-current={state === 'current' ? 'step' : undefined}>
            {!last && (
              <span aria-hidden className="absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-px bg-border">
                <motion.span
                  className="absolute inset-0 origin-top bg-gradient-to-b from-primary to-accent"
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: state === 'done' ? 1 : 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                />
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold',
                state === 'done' && 'border-transparent bg-brand-gradient text-primary-fg',
                state === 'current' && 'border-primary-text bg-bg text-primary-text',
                state === 'blocked' && 'border-danger bg-bg text-danger',
                state === 'upcoming' && 'border-border bg-bg text-fg-subtle',
              )}
            >
              {state === 'done' ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : state === 'blocked' ? (
                <X className="size-3.5" strokeWidth={3} />
              ) : (
                i + 1
              )}
              {state === 'current' && (
                <span className="absolute inset-0 rounded-full border border-primary-text motion-safe:animate-pulse-soft" />
              )}
            </span>
            <div className="pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  state === 'upcoming' ? 'text-fg-subtle' : 'text-fg',
                  state === 'blocked' && 'text-danger',
                )}
              >
                {TIMELINE_LABELS[step]}
                <span className="sr-only">
                  {' — '}
                  {state === 'done' ? 'done' : state === 'current' ? 'in progress' : state === 'blocked' ? 'blocked' : 'upcoming'}
                </span>
              </p>
              {hints[step] && state !== 'upcoming' && (
                <p className="mt-0.5 text-xs text-fg-muted">{hints[step]}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
