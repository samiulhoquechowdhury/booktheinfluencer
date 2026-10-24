'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, CalendarCheck, CalendarClock, CheckCircle2, FileText, Plus } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { Skeleton } from '@repo/ui/skeleton';
import { daysUntil, formatDate, formatTime, todayIST } from '@repo/utils';
import { useDashboard, useSession } from '@/lib/api/hooks';
import { ApiError } from '@/lib/api/client';
import { cityName } from '@/lib/reference';
import { DashHeader, DateBlock, StatCard } from '@/components/dashboard/dashboard-shell';
import { BookingRow, actionLabel, isActive, needsAction } from './booking-row';

/** Customer overview: key numbers, what needs doing, the next event and recent bookings. */
export function Dashboard() {
  const { data: session } = useSession();
  const q = useDashboard();
  const first = session?.name?.split(' ')[0];
  const today = todayIST();

  const header = (
    <DashHeader
      eyebrow="Overview"
      title={`Welcome back${first ? `, ${first}` : ''}`}
      description="Everything about your events in one place."
      actions={
        <Button asChild>
          <Link href="/enquire"><Plus aria-hidden /> New brief</Link>
        </Button>
      }
    />
  );

  if (q.isLoading) {
    return (
      <div className="pb-10">
        {header}
        <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="pb-10">
        {header}
        <EmptyState art="error" title="We couldn’t load your bookings" description={q.error instanceof ApiError ? q.error.message : 'Please try again.'} action={<Button onClick={() => void q.refetch()}>Try again</Button>} />
      </div>
    );
  }

  const bookings = q.data?.bookings ?? [];
  const briefs = q.data?.briefs ?? [];
  if (bookings.length === 0 && briefs.length === 0) {
    return (
      <div className="pb-10">
        {header}
        <div className="mt-8 rounded-3xl border border-border bg-surface p-8">
          <EmptyState art="calendar" title="No bookings yet" description="Send a brief with your event, date and budget. Your manager takes it from there." action={<Button asChild><Link href="/enquire">Start a brief</Link></Button>} />
        </div>
      </div>
    );
  }

  const active = bookings.filter(isActive);
  const todo = bookings.filter(needsAction);
  const confirmed = bookings.filter((b) => b.availability === 'CONFIRMED');
  const next = confirmed.filter((b) => b.event.date >= today).sort((a, b) => a.event.date.localeCompare(b.event.date))[0];
  const recent = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <div className="pb-10">
      {header}

      <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label="Active" value={active.length} hint="Bookings in progress" />
        <StatCard icon={AlertCircle} label="Needs your action" value={todo.length} hint={todo.length ? 'Quotes or payments waiting' : 'You’re all caught up'} tone={todo.length ? 'warning' : 'default'} />
        <StatCard icon={CheckCircle2} label="Confirmed" value={confirmed.length} hint="Contract and advance done" tone="success" />
        <StatCard icon={FileText} label="Open briefs" value={briefs.length} hint="We’re shortlisting talent" />
      </div>

      {todo.length > 0 && (
        <section aria-labelledby="todo-title" className="mt-6 rounded-2xl border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_6%,transparent)] p-5">
          <h2 id="todo-title" className="flex items-center gap-2 font-semibold"><AlertCircle className="size-4 text-warning" aria-hidden /> Waiting on you</h2>
          <ul className="mt-3 divide-y divide-border">
            {todo.map((b) => (
              <li key={b.ref} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.talent.name} · {b.event.title}</span>
                  <span className="block text-sm text-fg-muted">{formatDate(b.event.date)} · {cityName(b.event.city)}</span>
                </span>
                <Button asChild size="sm">
                  <Link href={`/account/bookings/${b.ref}`}>{actionLabel(b)} <ArrowRight aria-hidden /></Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="recent-title" className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 id="recent-title" className="font-semibold">Recent bookings</h2>
            <Link href="/account/bookings" className="text-sm font-medium text-primary-text hover:underline">View all</Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-border">
              {recent.map((b) => <li key={b.ref}><BookingRow b={b} /></li>)}
            </ul>
          ) : (
            <p className="p-5 text-sm text-fg-muted">No bookings yet. Your briefs appear on the right while we shortlist talent.</p>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="next-title" className="rounded-2xl border border-border bg-surface p-5">
            <h2 id="next-title" className="flex items-center gap-2 font-semibold"><CalendarCheck className="size-4 text-primary-text" aria-hidden /> Next event</h2>
            {next ? (
              <Link href={`/account/bookings/${next.ref}`} className="group mt-4 flex gap-4">
                <DateBlock date={next.event.date} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold group-hover:underline">{next.talent.name}</span>
                  <span className="block truncate text-sm text-fg-muted">{next.event.title}</span>
                  <span className="block text-xs text-fg-muted">{formatTime(next.event.startTime)} · {cityName(next.event.city)}</span>
                  <span className="tabular mt-1 block text-xs font-semibold text-primary-text">{daysUntil(next.event.date) === 0 ? 'Today' : `In ${daysUntil(next.event.date)} days`}</span>
                </span>
              </Link>
            ) : (
              <p className="mt-3 text-sm text-fg-muted">Nothing confirmed yet. Confirmed events show up here.</p>
            )}
          </section>

          {briefs.length > 0 && (
            <section aria-labelledby="briefs-title" className="rounded-2xl border border-border bg-surface p-5">
              <h2 id="briefs-title" className="font-semibold">Open briefs</h2>
              <ul className="mt-3 space-y-3">
                {briefs.map((b) => (
                  <li key={b.ref} className="rounded-xl border border-dashed border-border-strong p-3">
                    <p className="truncate text-sm font-medium">{b.event.title}</p>
                    <p className="text-xs text-fg-muted">{formatDate(b.event.date)} · {cityName(b.event.city)}</p>
                    <p className="mt-1.5 text-xs text-fg-muted">We’re shortlisting talent for you.</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
