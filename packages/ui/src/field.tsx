'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from './lib/use-reduced-motion';
import { Check } from 'lucide-react';
import { forwardRef, useId, type ReactNode } from 'react';
import { cn } from './lib/cn';

/**
 * Floating-label field: label always visible (sits inside, floats on focus/value),
 * focus glow, inline error that shakes once, animated success check.
 */
type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  prefix?: ReactNode;
  children: ReactNode;
  className?: string;
  multiline?: boolean;
};

export function FieldShell({ id, label, error, hint, valid, prefix, children, className, multiline }: FieldShellProps) {
  const reduce = useReducedMotion();
  return (
    <div className={cn('group/field', className)}>
      <div
        key={error ?? 'ok'}
        className={cn(
          'relative rounded-lg border bg-surface transition-[border-color,box-shadow] duration-(--duration-base)',
          'focus-within:border-primary-text focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)]',
          error ? 'border-danger motion-safe:animate-shake' : 'border-border hover:border-border-strong',
        )}
      >
        {prefix && (
          <span className="pointer-events-none absolute top-[1.625rem] left-3.5 text-[0.9375rem] text-fg-muted">{prefix}</span>
        )}
        {children}
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute left-3.5 origin-left text-fg-muted transition-transform duration-(--duration-base) ease-(--ease-out-expo)',
            'top-4 translate-y-0 text-[0.9375rem]',
            'peer-focus:-translate-y-2.5 peer-focus:scale-[0.78] peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-[0.78]',
            'peer-data-[filled=true]:-translate-y-2.5 peer-data-[filled=true]:scale-[0.78]',
            multiline && 'top-3.5',
          )}
        >
          {label}
        </label>
        <AnimatePresence>
          {valid && !error && (
            <motion.span
              aria-hidden
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className="absolute top-4 right-3.5 grid size-5 place-items-center rounded-full bg-success text-bg"
            >
              <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M3.5 8.5 6.5 11.5 12.5 4.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.1 }} />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1.5 px-1 text-xs font-medium text-danger"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p id={`${id}-hint`} className="mt-1.5 px-1 text-xs text-fg-muted">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const inputBase =
  'peer block w-full appearance-none rounded-lg bg-transparent px-3.5 pt-6 pb-2 text-[0.9375rem] text-fg outline-none placeholder:text-transparent';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  prefix?: ReactNode;
  shellClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, valid, prefix, shellClassName, className, id: idProp, ...props },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} valid={valid} prefix={prefix} className={shellClassName}>
      <input
        ref={ref}
        id={id}
        placeholder=" "
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, prefix && 'pl-8', valid && 'pr-10', className)}
        {...props}
      />
    </FieldShell>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  shellClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, shellClassName, className, id: idProp, ...props },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={shellClassName} multiline>
      <textarea
        ref={ref}
        id={id}
        placeholder=" "
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, 'resize-none pt-7', className)}
        {...props}
      />
    </FieldShell>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  shellClassName?: string;
};

/** Native select (best mobile UX + a11y) styled as a floating field. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, valid, options, placeholder = 'Select…', shellClassName, className, id: idProp, value, defaultValue, ...props },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} valid={valid} className={shellClassName}>
      <select
        ref={ref}
        id={id}
        value={value}
        defaultValue={defaultValue}
        data-filled="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, 'cursor-pointer bg-[url("data:image/svg+xml,%3Csvg_xmlns=%27http://www.w3.org/2000/svg%27_viewBox=%270_0_24_24%27_fill=%27none%27_stroke=%27%23888%27_stroke-width=%272%27%3E%3Cpath_d=%27m6_9_6_6_6-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.875rem_center] bg-no-repeat pr-10 [&>option]:bg-bg-elevated', className)}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export function CheckboxField({
  id,
  checked,
  onCheckedChange,
  children,
  error,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-fg-muted">
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="peer size-5 cursor-pointer appearance-none rounded-md border border-border-strong bg-surface transition-colors checked:border-transparent checked:bg-brand-gradient"
          />
          <Check className="pointer-events-none absolute size-3.5 scale-0 text-primary-fg transition-transform duration-(--duration-base) ease-(--ease-out-expo) peer-checked:scale-100" strokeWidth={3} aria-hidden />
        </span>
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger motion-safe:animate-shake">
          {error}
        </p>
      )}
    </div>
  );
}
