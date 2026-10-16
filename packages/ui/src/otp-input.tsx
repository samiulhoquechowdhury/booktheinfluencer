'use client';

import { motion } from 'motion/react';
import { useReducedMotion } from './lib/use-reduced-motion';
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from './lib/cn';

/** 6-box OTP: auto-advance, backspace-to-previous, paste support, subtle bounce on fill. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  error,
  disabled,
  label = 'One-time code',
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const reduce = useReducedMotion();
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, '');
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className={cn('flex gap-2 sm:gap-3', error && 'motion-safe:animate-shake')}>
        {digits.map((d, i) => (
          <motion.input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`Digit ${i + 1} of ${length}`}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            value={d}
            animate={d && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(-1);
              setAt(i, v);
              if (v && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(
              'tabular h-14 w-full min-w-0 max-w-14 rounded-lg border bg-surface text-center font-display text-2xl font-bold outline-none transition-[border-color,box-shadow]',
              'focus:border-primary-text focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)]',
              error ? 'border-danger' : d ? 'border-border-strong' : 'border-border',
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
