'use client';

import { Popover } from 'radix-ui';
import { CalendarDays, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { formatDate, todayIST } from '@repo/utils';
import { Calendar, dateToIso, isoToDate } from './calendar';
import { FieldShell } from './field';
import { cn } from './lib/cn';

type Variant = 'field' | 'box' | 'bare';

const TRIGGER: Record<Variant, string> = {
  field: 'flex w-full items-center justify-between gap-3 rounded-lg bg-transparent px-3.5 pt-6 pb-2 text-left text-[0.9375rem] outline-none',
  box: 'flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm outline-none transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary-text focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_20%,transparent)] data-[state=open]:border-primary-text',
  bare: 'flex w-full min-w-0 items-center justify-between gap-2 bg-transparent text-left text-[0.9375rem] font-medium outline-none',
};

/**
 * Date picker: trigger shows "Sat, 14 Feb 2027"; popover holds the shared Calendar with quick
 * picks. Value is a YYYY-MM-DD string ('' = none). `min` defaults to today (IST).
 */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Pick a date',
  min,
  disabledDates = [],
  variant = 'box',
  clearable = true,
  error,
  hint,
  valid,
  id: idProp,
  className,
  'aria-label': ariaLabel,
  footer,
  onBlur,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  min?: string;
  disabledDates?: readonly string[];
  variant?: Variant;
  clearable?: boolean;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
  footer?: ReactNode;
  onBlur?: () => void;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const [open, setOpen] = useState(false);
  const minIso = min ?? todayIST();
  const selected = value ? isoToDate(value) : undefined;
  const [month, setMonth] = useState<Date>(() => selected ?? isoToDate(minIso));

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };
  const shortcut = (days: number) => {
    const d = isoToDate(minIso);
    d.setDate(d.getDate() + days);
    return dateToIso(d);
  };
  const nextSaturday = () => {
    const d = isoToDate(minIso);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return dateToIso(d);
  };

  const trigger = (
    <Popover.Trigger
      id={id}
      aria-label={ariaLabel ?? (label ? undefined : 'Choose a date')}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      className={cn('group/dp cursor-pointer', TRIGGER[variant], valid && variant === 'field' && 'pr-10')}
    >
      <span className={cn('tabular truncate', !value && 'text-fg-muted')}>{value ? formatDate(value) : placeholder}</span>
      {!(valid && variant === 'field') && (
        <CalendarDays className="size-4 shrink-0 text-fg-muted transition-colors group-data-[state=open]/dp:text-primary-text" aria-hidden />
      )}
    </Popover.Trigger>
  );

  const content = (
    <Popover.Portal>
      <Popover.Content
        align="start"
        sideOffset={8}
        collisionPadding={12}
        data-lenis-prevent
        onOpenAutoFocus={(e) => {
          // Focus the selected (or first enabled) day, not the popover shell.
          e.preventDefault();
          requestAnimationFrame(() =>
            (e.target as HTMLElement | null)?.querySelector<HTMLButtonElement>('td[aria-selected="true"] button, td button:not([disabled])')?.focus(),
          );
        }}
        className="pop z-[98] w-max max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-bg-elevated p-3 shadow-float sm:p-4"
      >
        <Calendar
          mode="single"
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          startMonth={isoToDate(minIso)}
          disabled={[{ before: isoToDate(minIso) }, ...disabledDates.map(isoToDate)]}
          onSelect={(d) => d && pick(dateToIso(d))}
          classNames={{
            day: 'relative size-9 p-0.5 text-center text-sm sm:size-10',
            weekday: 'w-9 pb-1 text-center text-[0.6875rem] font-semibold tracking-wide text-fg-subtle uppercase sm:w-10',
            month_caption: 'flex h-9 items-center pl-1',
            button_previous: 'grid size-9 place-items-center rounded-full border border-border text-fg transition-[background-color,transform] hover:bg-surface-2 active:scale-90 disabled:pointer-events-none disabled:opacity-30',
            button_next: 'grid size-9 place-items-center rounded-full border border-border text-fg transition-[background-color,transform] hover:bg-surface-2 active:scale-90 disabled:pointer-events-none disabled:opacity-30',
          }}
        />
        <div className="mt-3 flex items-start justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Next Saturday', iso: nextSaturday() },
              { label: 'In 2 weeks', iso: shortcut(14) },
              { label: 'In a month', iso: shortcut(30) },
            ]
              .filter((s) => !disabledDates.includes(s.iso))
              .map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => pick(s.iso)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    value === s.iso ? 'border-transparent bg-fg text-bg' : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
                  )}
                >
                  {s.label}
                </button>
              ))}
          </div>
          {clearable && value && (
            <button type="button" onClick={() => pick('')} className="shrink-0 py-1 text-xs font-semibold text-fg underline-offset-4 hover:underline">
              Clear
            </button>
          )}
        </div>
        {footer}
      </Popover.Content>
    </Popover.Portal>
  );

  const root = (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && selected) setMonth(selected);
        if (!o) onBlur?.();
      }}
    >
      <div className="relative w-full min-w-0">
        {trigger}
        {variant === 'box' && clearable && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear date"
            className="absolute top-1/2 right-9 grid size-6 -translate-y-1/2 place-items-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {content}
    </Popover.Root>
  );

  if (variant === 'field' && label) {
    return (
      <FieldShell id={id} label={label} error={error} hint={hint} valid={valid} className={className} floated>
        {root}
      </FieldShell>
    );
  }
  return <div className={cn('w-full min-w-0', className)}>{root}</div>;
}
