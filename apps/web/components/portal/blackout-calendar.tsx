'use client';

import { DayPicker } from 'react-day-picker';
import { useState } from 'react';
import { CalendarOff, Loader2, X } from 'lucide-react';
import type { Blackout, TalentBooking } from '@repo/schemas';
import { EmptyState } from '@repo/ui/empty-state';
import { Skeleton } from '@repo/ui/skeleton';
import { Button } from '@repo/ui/button';
import { formatDate, todayIST } from '@repo/utils';
import { ApiError } from '@/lib/api/client';
import { useBlackouts, useToggleBlackout } from '@/lib/api/hooks';
import { useMediaQuery } from '@/lib/motion';

/** Calendar date as the user picked it (local components) → YYYY-MM-DD. */
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/** Blackout dates (TAL-3). Confirmed booking dates are locked; past dates can't change. */
export function BlackoutCalendar({ bookings, editable }: { bookings: TalentBooking[]; editable: boolean }) {
  const q = useBlackouts();
  const toggle = useToggleBlackout();
  const twoMonths = useMediaQuery('(min-width: 768px)');
  const [month, setMonth] = useState(() => fromIso(todayIST()));

  if (q.isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (q.isError) return <EmptyState art="error" title="Couldn’t load your calendar" description={q.error instanceof ApiError ? q.error.message : undefined} action={<Button onClick={() => void q.refetch()}>Try again</Button>} />;

  const blackouts: Blackout[] = q.data ?? [];
  const blackoutDates = blackouts.map((b) => fromIso(b.date));
  const booked = bookings.filter((b) => b.availability === 'CONFIRMED').map((b) => fromIso(b.event.date));
  const pending = bookings.filter((b) => b.availability !== 'CONFIRMED' && b.availability !== 'UNAVAILABLE').map((b) => fromIso(b.event.date));
  const today = fromIso(todayIST());
  const upcoming = blackouts.filter((b) => b.date >= todayIST());

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <DayPicker
          mode="multiple"
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={twoMonths ? 2 : 1}
          weekStartsOn={1}
          selected={blackoutDates}
          disabled={editable ? [{ before: today }, ...booked] : true}
          modifiers={{ booked, pending }}
          onDayClick={(day, mods) => {
            if (!editable || mods.disabled) return;
            const iso = toIso(day);
            toggle.mutate({ date: iso, on: !mods.selected });
          }}
          classNames={{
            root: 'relative',
            months: 'flex flex-col gap-8 md:flex-row',
            month: 'space-y-4',
            month_caption: 'flex h-10 items-center font-display text-lg font-extrabold',
            nav: 'absolute top-0 right-0 flex gap-1',
            button_previous: 'grid size-10 place-items-center rounded-full border border-border hover:bg-surface-2 disabled:opacity-40',
            button_next: 'grid size-10 place-items-center rounded-full border border-border hover:bg-surface-2 disabled:opacity-40',
            chevron: 'size-4 fill-fg',
            weekdays: 'flex',
            weekday: 'w-11 text-center text-xs font-medium text-fg-subtle',
            week: 'flex',
            day: 'size-11 p-0.5 text-center text-sm',
            day_button: 'tabular size-full rounded-lg font-medium transition-[background-color,transform] hover:bg-surface-3 active:scale-95 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            selected: '[&>button]:bg-fg [&>button]:text-bg [&>button]:line-through [&>button]:hover:bg-fg',
            today: '[&>button]:ring-1 [&>button]:ring-primary-text',
            disabled: 'text-fg-subtle/60',
            outside: 'opacity-30',
          }}
          modifiersClassNames={{
            booked: '[&>button]:!bg-[color-mix(in_oklab,var(--success)_22%,transparent)] [&>button]:!text-success [&>button]:!no-underline',
            pending: '[&>button]:ring-1 [&>button]:ring-warning',
          }}
        />
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-muted" aria-label="Legend">
          <li className="flex items-center gap-2"><span className="size-3 rounded bg-fg" /> Blackout</li>
          <li className="flex items-center gap-2"><span className="size-3 rounded bg-[color-mix(in_oklab,var(--success)_40%,transparent)]" /> Confirmed booking</li>
          <li className="flex items-center gap-2"><span className="size-3 rounded ring-1 ring-warning" /> Enquiry in progress</li>
          {toggle.isPending && <li className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" aria-hidden /> Saving</li>}
        </ul>
        {!editable && <p className="mt-4 text-sm text-warning">Blackout editing is managed by your talent manager.</p>}
      </div>

      <aside aria-labelledby="bo-title">
        <h3 id="bo-title" className="eyebrow mb-4">Upcoming blackouts</h3>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-sm text-fg-muted">
            <CalendarOff className="mx-auto mb-3 size-6" aria-hidden />
            No blackout dates. Tap a date to block it.
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((b) => (
              <li key={b.date} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold">{formatDate(b.date)}</span>
                  {b.reason && <span className="block text-xs text-fg-muted">{b.reason}</span>}
                </span>
                {editable && (
                  <button type="button" onClick={() => toggle.mutate({ date: b.date, on: false })} aria-label={`Remove blackout on ${formatDate(b.date)}`} className="grid size-8 place-items-center rounded-full hover:bg-surface-2">
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-fg-subtle">Blackouts hide you from searches for that date. They never mark you as available on other dates.</p>
      </aside>
    </div>
  );
}
