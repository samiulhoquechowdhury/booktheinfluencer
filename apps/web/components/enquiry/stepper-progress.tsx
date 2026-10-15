'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@repo/ui/lib/cn';

/** Progress bar that morphs between steps + labelled step markers. */
export function StepperProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  const reduce = useReducedMotion();
  return (
    <div>
      <div className="relative h-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1} aria-label={`Step ${current + 1} of ${steps.length}`}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
          initial={false}
          animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24 }}
        />
      </div>
      <ol className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s} className={cn('flex items-center gap-2 text-xs font-semibold sm:text-sm', i <= current ? 'text-fg' : 'text-fg-subtle')} aria-current={i === current ? 'step' : undefined}>
            <motion.span
              className={cn('grid size-6 shrink-0 place-items-center rounded-full border text-[0.6875rem]', i < current ? 'border-transparent bg-fg text-bg' : i === current ? 'border-fg' : 'border-border')}
              animate={i === current && !reduce ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {i < current ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
            </motion.span>
            <span className="truncate">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
