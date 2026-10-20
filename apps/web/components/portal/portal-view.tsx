'use client';

import { useState } from 'react';
import { CalendarDays, Clock, MapPin, UserRound } from 'lucide-react';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { Money } from '@repo/ui/money';
import { Skeleton } from '@repo/ui/skeleton';
import { TabPanel, Tabs } from '@repo/ui/tabs';
import { cn } from '@repo/ui/lib/cn';
import { EVENT_TYPE_LABELS, formatDate, formatDateTime, formatTime, paiseToDisplayRupees, sumPaise, todayIST } from '@repo/utils';
import { ApiError } from '@/lib/api/client';
import { usePayouts, usePortalBookings, usePortalProfile } from '@/lib/api/hooks';
import { cityName } from '@/lib/reference';
import { CountUp, Reveal, RevealItem } from '@/lib/motion';
import { BlackoutCalendar } from './blackout-calendar';

const PAYOUT_TONE = { PAID: 'text-success', PENDING: 'text-warning', SCHEDULED: 'text-fg-muted' } as const;
const CONTRACT_LABEL = { NOT_SENT: 'Contract not issued', SENT: 'Contract out for signature', SIGNED: 'Contract signed' } as const;

/** Talent portal (TAL-1..3). Shows the talent's payout only — never selling price or margin. */
export function PortalView() {
  const profile = usePortalProfile();
  const bookings = usePortalBookings();
  const payouts = usePayouts();
  const [tab, setTab] = useState('bookings');
  const today = todayIST();

  const upcoming = (bookings.data ?? []).filter((b) => b.event.date >= today);
  const pendingPaise = sumPaise((payouts.data ?? []).filter((p) => p.status !== 'PAID').map((p) => p.amountPaise));
  const paidPaise = sumPaise((payouts.data ?? []).filter((p) => p.status === 'PAID').map((p) => p.amountPaise));

  return (
    <div className="pb-10">
      <p className="eyebrow">Talent portal</p>
      <h1 className="mt-2 font-display text-display font-black">
        {profile.data ? profile.data.name.split(' (')[0] : <Skeleton className="inline-block h-14 w-64 align-middle" />}
        <span className="text-gradient">.</span>
      </h1>

      <dl className="mt-10 grid grid-cols-1 gap-6 border-y border-border py-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-fg-muted">Upcoming bookings</dt>
          <dd><CountUp value={upcoming.length} className="font-display text-5xl font-black tracking-tight" /></dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">Payouts due to you</dt>
          <dd>{payouts.data ? <CountUp value={paiseToDisplayRupees(pendingPaise)} format="inr" className="font-display text-5xl font-black tracking-tight" /> : <Skeleton className="h-12 w-40" />}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">Paid out</dt>
          <dd>{payouts.data ? <CountUp value={paiseToDisplayRupees(paidPaise)} format="inr" className="font-display text-5xl font-black tracking-tight text-fg-muted" /> : <Skeleton className="h-12 w-40" />}</dd>
        </div>
      </dl>

      <Tabs
        className="mt-10"
        value={tab}
        onValueChange={setTab}
        layoutId="portal-tabs"
        items={[
          { value: 'bookings', label: 'My bookings', count: bookings.data?.length },
          { value: 'payouts', label: 'My payouts', count: payouts.data?.length },
          { value: 'calendar', label: 'Blackout dates' },
        ]}
      >
        <TabPanel value="bookings">
          {bookings.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          ) : bookings.isError ? (
            <EmptyState art="error" title="Couldn’t load bookings" description={bookings.error instanceof ApiError ? bookings.error.message : undefined} action={<Button onClick={() => void bookings.refetch()}>Try again</Button>} />
          ) : !bookings.data?.length ? (
            <EmptyState art="calendar" title="No bookings yet" description="New requests appear here once your manager confirms the details with you." />
          ) : (
            <Reveal stagger as="ul" className="space-y-3">
              {bookings.data.map((b) => {
                const past = b.event.date < today;
                return (
                  <RevealItem as="li" key={b.ref} className={cn('grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-[1fr_auto] md:items-center', past && 'border-dashed bg-transparent')}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular text-xs text-fg-muted">{b.ref}</span>
                        <AvailabilityPill status={b.availability} size="sm" />
                        {past && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">Completed</span>}
                      </div>
                      <p className="mt-2 font-display text-xl font-extrabold tracking-tight">{b.event.title}</p>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{formatDate(b.event.date)} · {formatTime(b.event.startTime)}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{b.event.venue}, {cityName(b.event.city)}</span>
                        <span>{EVENT_TYPE_LABELS[b.event.type]} · {b.event.durationMins} min</span>
                      </p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
                        <span>{CONTRACT_LABEL[b.contract]}</span>
                        {b.reportingTime && <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden />Report by {formatTime(b.reportingTime)}</span>}
                        <span className="inline-flex items-center gap-1"><UserRound className="size-3" aria-hidden />{b.pointOfContact}</span>
                      </p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-xs text-fg-muted">Your payout</p>
                      {b.payoutPaise != null ? <Money paise={b.payoutPaise} className="font-display text-2xl font-extrabold" /> : <p className="text-sm font-medium text-fg-muted">Set in contract</p>}
                    </div>
                  </RevealItem>
                );
              })}
            </Reveal>
          )}
        </TabPanel>

        <TabPanel value="payouts">
          {payouts.isLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : payouts.isError ? (
            <EmptyState art="error" title="Couldn’t load payouts" description={payouts.error instanceof ApiError ? payouts.error.message : undefined} action={<Button onClick={() => void payouts.refetch()}>Try again</Button>} />
          ) : !payouts.data?.length ? (
            <EmptyState art="inbox" title="No payouts yet" description="Payouts are created after each completed event." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[600px] text-sm">
                <caption className="sr-only">Your payouts</caption>
                <thead className="bg-surface text-left text-xs text-fg-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Event</th>
                    <th scope="col" className="px-5 py-3 font-medium">Status</th>
                    <th scope="col" className="px-5 py-3 font-medium">Reference</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payouts.data.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-4">
                        <span className="block font-medium">{p.eventTitle}</span>
                        <span className="tabular block text-xs text-fg-muted">{p.bookingRef} · {formatDate(p.eventDate)}</span>
                      </td>
                      <td className={cn('px-5 py-4 font-semibold', PAYOUT_TONE[p.status])}>
                        {p.status === 'PAID' ? 'Paid' : p.status === 'PENDING' ? 'Processing' : 'Scheduled after event'}
                        {p.paidAt && <span className="block text-xs font-normal text-fg-muted">{formatDateTime(p.paidAt)}</span>}
                      </td>
                      <td className="tabular px-5 py-4 text-fg-muted">{p.reference ?? '—'}</td>
                      <td className="px-5 py-4 text-right"><Money paise={p.amountPaise} className="font-semibold" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabPanel>

        <TabPanel value="calendar">
          <BlackoutCalendar bookings={bookings.data ?? []} editable={profile.data?.blackoutEditable ?? false} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
