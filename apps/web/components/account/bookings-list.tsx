'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { Skeleton } from '@repo/ui/skeleton';
import { cn } from '@repo/ui/lib/cn';
import { todayIST } from '@repo/utils';
import { ApiError } from '@/lib/api/client';
import { useDashboard } from '@/lib/api/hooks';
import { DashHeader } from '@/components/dashboard/dashboard-shell';
import { BookingRow, isActive, needsAction } from './booking-row';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Needs action' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
] as const;
type Filter = (typeof FILTERS)[number]['key'];

/** All of a customer's bookings, filterable by what needs doing. */
export function BookingsList() {
  const q = useDashboard();
  const [filter, setFilter] = useState<Filter>('all');
  const today = todayIST();
  // Upcoming soonest first, then past events newest first.
  const all = [...(q.data?.bookings ?? [])].sort((a, b) => {
    const pa = a.event.date < today, pb = b.event.date < today;
    if (pa !== pb) return pa ? 1 : -1;
    return pa ? b.event.date.localeCompare(a.event.date) : a.event.date.localeCompare(b.event.date);
  });
  const pick = { all, action: all.filter(needsAction), active: all.filter(isActive), past: all.filter((b) => !isActive(b)) };
  const shown = pick[filter];

  return (
    <div className="pb-10">
      <DashHeader
        eyebrow="Bookings"
        title="Your bookings"
        description="Open any booking for its quote, payments, documents and your manager’s contact."
        actions={<Button asChild><Link href="/enquire"><Plus aria-hidden /> New brief</Link></Button>}
      />

      <div role="group" aria-label="Filter bookings" className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn('flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors', filter === f.key ? 'border-transparent bg-fg text-bg' : 'border-border text-fg-muted hover:text-fg')}
          >
            {f.label}
            {q.data && <span className="tabular text-xs opacity-80">{pick[f.key].length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {q.isLoading ? (
          <Skeleton className="h-80 rounded-2xl" />
        ) : q.isError ? (
          <EmptyState art="error" title="We couldn’t load your bookings" description={q.error instanceof ApiError ? q.error.message : 'Please try again.'} action={<Button onClick={() => void q.refetch()}>Try again</Button>} />
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8">
            <EmptyState art="calendar" title={filter === 'all' ? 'No bookings yet' : 'Nothing here'} description={filter === 'all' ? 'Send a brief and your manager will take it from there.' : 'No bookings match this filter.'} action={filter === 'all' ? <Button asChild><Link href="/enquire">Start a brief</Link></Button> : undefined} />
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {shown.map((b) => <li key={b.ref}><BookingRow b={b} /></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
