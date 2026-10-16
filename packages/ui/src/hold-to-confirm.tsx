'use client';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useReducedMotion } from './lib/use-reduced-motion';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from './lib/cn';

/**
 * Press-and-hold (1.2s) to confirm. Works with pointer and keyboard (hold Space/Enter).
 * Release early → fill drains. Prevents accidental acceptance of binding actions.
 */
export function HoldToConfirm({
  children,
  onConfirm,
  duration = 1.2,
  disabled,
  className,
}: {
  children: ReactNode;
  onConfirm: () => void;
  duration?: number;
  disabled?: boolean;
  className?: string;
}) {
  const progress = useMotionValue(0);
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  const ctrl = useRef<ReturnType<typeof animate> | null>(null);
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();

  const start = () => {
    if (disabled || done) return;
    ctrl.current?.stop();
    ctrl.current = animate(progress, 1, {
      duration: duration * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => {
        setDone(true);
        onConfirm();
      },
    });
  };
  const cancel = () => {
    if (done) return;
    ctrl.current?.stop();
    ctrl.current = animate(progress, 0, { duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] });
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-describedby="hold-hint"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') cancel();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'relative isolate flex h-16 w-full touch-none select-none items-center justify-center overflow-hidden rounded-full border border-border-strong bg-surface px-8 font-semibold text-fg transition-transform active:scale-[0.98] disabled:opacity-50',
        className,
      )}
    >
      <motion.span aria-hidden style={{ scaleX }} className="absolute inset-0 -z-10 origin-left bg-brand-gradient" />
      <span className="relative">{children}</span>
      <span id="hold-hint" className="sr-only">
        Press and hold for about one second to confirm.
      </span>
    </button>
  );
}
