'use client';

import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './lib/cn';

/** Calendar date ↔ YYYY-MM-DD using local components (the date the user means, not a UTC instant). */
export const dateToIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isoToDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};

const CLASSES = {
  root: 'relative select-none',
  months: 'relative flex flex-col gap-8 sm:flex-row',
  month: 'relative space-y-3 overflow-hidden',
  month_caption: 'flex h-10 items-center pl-1',
  caption_label: 'font-display text-lg font-extrabold tracking-tight',
  nav: 'absolute top-0 right-0 z-10 flex gap-1',
  button_previous:
    'grid size-10 place-items-center rounded-full border border-border text-fg transition-[background-color,transform] hover:bg-surface-2 active:scale-90 disabled:pointer-events-none disabled:opacity-30',
  button_next:
    'grid size-10 place-items-center rounded-full border border-border text-fg transition-[background-color,transform] hover:bg-surface-2 active:scale-90 disabled:pointer-events-none disabled:opacity-30',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday: 'w-10 pb-1 text-center text-[0.6875rem] font-semibold tracking-wide text-fg-subtle uppercase sm:w-11',
  week: 'flex',
  day: 'relative size-10 p-0.5 text-center text-sm sm:size-11',
  day_button:
    'tabular relative size-full rounded-xl font-medium outline-none transition-[background-color,color,transform] duration-(--duration-fast) hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:pointer-events-none',
  selected:
    '[&>button]:bg-brand-gradient [&>button]:font-bold [&>button]:text-primary-fg [&>button]:shadow-[0_8px_20px_-8px_var(--glow-1)]',
  today:
    "font-bold text-primary-text [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-current [&>button]:after:content-['']",
  disabled: 'text-fg-subtle opacity-40',
  outside: 'text-fg-subtle opacity-50',
  hidden: 'invisible',
} as const;

/** Shared calendar: animated month changes, Monday start, token-styled days. */
export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      animate
      weekStartsOn={1}
      showOutsideDays
      fixedWeeks
      className={cn(className)}
      classNames={{ ...CLASSES, ...classNames }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />,
      }}
      {...props}
    />
  );
}
