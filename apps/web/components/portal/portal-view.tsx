'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarDays, CalendarOff, CalendarRange, Clock, ExternalLink, FileSignature, IndianRupee, LayoutDashboard, MapPin, MessageCircle, UserRound, Wallet } from 'lucide-react';
import type { TalentBooking, TalentPayout } from '@repo/schemas';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { Money } from '@repo/ui/money';
import { Skeleton } from '@repo/ui/skeleton';
import { cn } from '@repo/ui/lib/cn';
import { EVENT_TYPE_LABELS, daysUntil, formatDate, formatDateTime, formatTime, sumPaise, todayIST } from '@repo/utils';
import { ApiError } from '@/lib/api/client';
import { usePayouts, usePortalBookings, usePortalProfile } from '@/lib/api/hooks';
import { cityName } from '@/lib/reference';
import { DashHeader, DashboardShell, DateBlock, HelpCard, StatCard } from '@/components/dashboard/dashboard-shell';
import { BlackoutCalendar } from './blackout-calendar';

const PAYOUT_STATUS = {
  PAID: { label: 'Paid', cls: 'bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success' },
  PENDING: { label: 'Processing', cls: 'bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-warning' },
  SCHEDULED: { label: 'After the event', cls: 'bg-surface-2 text-fg-muted' },
} as const;
const CONTRACT_LABEL = { NOT_SENT: 'Contract not issued', SENT: 'Contract out for signature', SIGNED: 'Contract signed' } as const;

type Section = 'overview' | 'bookings' | 'payouts' | 'calendar';

/** Talent portal (TAL-1..3). Shows the talent's payout only — never selling price or margin. */
export function PortalView() {
  const profile = usePortalProfile();
  const bookings = usePortalBookings();
  const payouts = usePayouts();
  const [section, setSection] = useState<Section>('overview');
  const today = todayIST();

  const all = [...(bookings.data ?? [])].sort((a, b) => a.event.date.localeCompare(b.event.date));
  const upcoming = all.filter((b) => b.event.date >= today);
  const past = all.filter((b) => b.event.date < today).reverse();
  const dueList = (payouts.data ?? []).filter((p) => p.status !== 'PAID');
  const pendingPaise = sumPaise(dueList.map((p) => p.amountPaise));
  const paidPaise = sumPaise((payouts.data ?? []).filter((p) => p.status === 'PAID').map((p) => p.amountPaise));
  const name = profile.data?.name.split(' (')[0] ?? 'Talent';
  const go = (s: Section) => () => {
    setSection(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardShell
      name={name}
      caption="Talent portal"
      nav={[
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, onSelect: go('overview'), active: section === 'overview' },
        { key: 'bookings', label: 'Bookings', icon: CalendarDays, onSelect: go('bookings'), active: section === 'bookings', count: upcoming.length },
        { key: 'payouts', label: 'Payouts', icon: Wallet, onSelect: go('payouts'), active: section === 'payouts' },
        { key: 'calendar', label: 'Availability', icon: CalendarOff, onSelect: go('calendar'), active: section === 'calendar' },
      ]}
      footer={
        <div className="space-y-3">
          {profile.data && (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/t/${profile.data.talentSlug}`} target="_blank"><ExternalLink aria-hidden /> View public profile</Link>
            </Button>
          )}
          <HelpCard title="Questions about a booking?" body="Your point of contact is listed on each booking. Changes to your profile or fees go through your manager." action={<Button asChild variant="outline" size="sm" className="w-full"><Link href="/contact"><MessageCircle aria-hidden /> Contact the team</Link></Button>} />
        </div>
      }
    >
      <div className="pb-10">
        {section === 'overview' && (
          <>
            <DashHeader eyebrow="Talent portal" title={profile.data ? `Hello, ${name.split(' ')[0]}` : <Skeleton className="h-10 w-56" />} description="Your confirmed shows, payouts and blocked dates." />

            <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard icon={CalendarDays} label="Upcoming shows" value={bookings.data ? upcoming.length : <Skeleton className="h-9 w-12" />} hint={upcoming[0] ? `Next: ${formatDate(upcoming[0].event.date)}` : 'None scheduled'} />
              <StatCard icon={CalendarRange} label="Completed" value={bookings.data ? past.length : <Skeleton className="h-9 w-12" />} hint="Shows done through us" tone="success" />
              <StatCard icon={Wallet} label="Payouts due" value={payouts.data ? <Money paise={pendingPaise} /> : <Skeleton className="h-9 w-24" />} hint={`${dueList.length} pending`} tone={dueList.length ? 'warning' : 'default'} />
              <StatCard icon={IndianRupee} label="Paid out" value={payouts.data ? <Money paise={paidPaise} /> : <Skeleton className="h-9 w-24" />} hint="All time" tone="success" />
            </div>

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <section aria-labelledby="next-show" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="next-show" className="font-semibold">Next show</h2>
                  {upcoming.length > 1 && <button type="button" onClick={go('bookings')} className="text-sm font-medium text-primary-text hover:underline">All bookings</button>}
                </div>
                {bookings.isLoading ? (
                  <Skeleton className="mt-4 h-32 rounded-xl" />
                ) : upcoming[0] ? (
                  <NextShow b={upcoming[0]} />
                ) : (
                  <p className="mt-4 text-sm text-fg-muted">No upcoming shows. New bookings appear here once your manager confirms the details with you.</p>
                )}
              </section>

              <section aria-labelledby="recent-payouts" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="recent-payouts" className="font-semibold">Recent payouts</h2>
                  {(payouts.data?.length ?? 0) > 0 && <button type="button" onClick={go('payouts')} className="text-sm font-medium text-primary-text hover:underline">View all</button>}
                </div>
                {payouts.isLoading ? (
                  <Skeleton className="mt-4 h-32 rounded-xl" />
                ) : payouts.data?.length ? (
                  <ul className="mt-3 divide-y divide-border">
                    {payouts.data.slice(0, 4).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.eventTitle}</span>
                          <span className="block text-xs text-fg-muted">{formatDate(p.eventDate)}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <Money paise={p.amountPaise} className="block text-sm font-semibold" />
                          <PayoutBadge p={p} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-fg-muted">Payouts are created after each completed show.</p>
                )}
              </section>
            </div>
          </>
        )}

        {section === 'bookings' && (
          <>
            <DashHeader eyebrow="Bookings" title="Your shows" description="Confirmed details from your manager. Your payout is shown; client pricing is not." />
            <div className="mt-8 space-y-8">
              {bookings.isLoading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : bookings.isError ? (
                <EmptyState art="error" title="Couldn’t load bookings" description={bookings.error instanceof ApiError ? bookings.error.message : undefined} action={<Button onClick={() => void bookings.refetch()}>Try again</Button>} />
              ) : !all.length ? (
                <div className="rounded-2xl border border-border bg-surface p-8"><EmptyState art="calendar" title="No bookings yet" description="New bookings appear here once your manager confirms the details with you." /></div>
              ) : (
                <>
                  <BookingGroup title="Upcoming" items={upcoming} empty="No upcoming shows." />
                  {past.length > 0 && <BookingGroup title="Past" items={past} past />}
                </>
              )}
            </div>
          </>
        )}

        {section === 'payouts' && (
          <>
            <DashHeader eyebrow="Payouts" title="Your payouts" description="Created after each completed show and paid to your registered account." />
            <div className="mt-8 grid grid-cols-2 gap-3">
              <StatCard icon={Wallet} label="Due to you" value={payouts.data ? <Money paise={pendingPaise} /> : <Skeleton className="h-9 w-24" />} tone="warning" />
              <StatCard icon={IndianRupee} label="Paid out" value={payouts.data ? <Money paise={paidPaise} /> : <Skeleton className="h-9 w-24" />} tone="success" />
            </div>
            <div className="mt-6">
              {payouts.isLoading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : payouts.isError ? (
                <EmptyState art="error" title="Couldn’t load payouts" description={payouts.error instanceof ApiError ? payouts.error.message : undefined} action={<Button onClick={() => void payouts.refetch()}>Try again</Button>} />
              ) : !payouts.data?.length ? (
                <div className="rounded-2xl border border-border bg-surface p-8"><EmptyState art="inbox" title="No payouts yet" description="Payouts are created after each completed show." /></div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                  <table className="w-full min-w-[560px] text-sm">
                    <caption className="sr-only">Your payouts</caption>
                    <thead className="border-b border-border text-left text-xs text-fg-muted">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-medium">Show</th>
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
                          <td className="px-5 py-4">
                            <PayoutBadge p={p} />
                            {p.paidAt && <span className="mt-1 block text-xs text-fg-muted">{formatDateTime(p.paidAt)}</span>}
                          </td>
                          <td className="tabular px-5 py-4 text-fg-muted">{p.reference ?? '—'}</td>
                          <td className="px-5 py-4 text-right"><Money paise={p.amountPaise} className="font-semibold" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {section === 'calendar' && (
          <>
            <DashHeader eyebrow="Availability" title="Blocked dates" description="Block dates you can’t perform. Confirmed shows are locked." />
            <div className="mt-8">
              <BlackoutCalendar bookings={bookings.data ?? []} editable={profile.data?.blackoutEditable ?? false} />
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function PayoutBadge({ p }: { p: TalentPayout }) {
  const s = PAYOUT_STATUS[p.status];
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', s.cls)}>{s.label}</span>;
}

function NextShow({ b }: { b: TalentBooking }) {
  const d = daysUntil(b.event.date);
  return (
    <div className="mt-4 flex flex-col gap-5 sm:flex-row">
      <DateBlock date={b.event.date} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular rounded-full bg-brand-gradient px-2.5 py-0.5 text-xs font-semibold text-primary-fg">{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`}</span>
          <AvailabilityPill status={b.availability} size="sm" />
        </div>
        <p className="mt-2 font-display text-xl font-extrabold tracking-tight">{b.event.title}</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Fact icon={Clock} label="Show time" value={`${formatTime(b.event.startTime)} · ${b.event.durationMins} min`} />
          <Fact icon={MapPin} label="Venue" value={`${b.event.venue}, ${cityName(b.event.city)}`} />
          <Fact icon={UserRound} label="Point of contact" value={b.pointOfContact} />
          <Fact icon={Wallet} label="Your payout" value={b.payoutPaise != null ? <Money paise={b.payoutPaise} /> : 'Set in contract'} />
        </dl>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-fg-muted">{label}</dt>
        <dd className="font-medium break-words">{value}</dd>
      </div>
    </div>
  );
}

function BookingGroup({ title, items, empty, past = false }: { title: string; items: TalentBooking[]; empty?: string; past?: boolean }) {
  return (
    <section aria-label={title}>
      <h2 className="eyebrow mb-3">{title} · {items.length}</h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong p-5 text-sm text-fg-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((b) => (
            <li key={b.ref} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <DateBlock date={b.event.date} muted={past} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{b.event.title}</span>
                  {!past && <AvailabilityPill status={b.availability} size="sm" />}
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
                  <span>{EVENT_TYPE_LABELS[b.event.type]} · {b.event.durationMins} min</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{b.event.venue}, {cityName(b.event.city)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden />{b.reportingTime ? `Report by ${formatTime(b.reportingTime)}` : formatTime(b.event.startTime)}</span>
                  <span className="inline-flex items-center gap-1"><FileSignature className="size-3" aria-hidden />{CONTRACT_LABEL[b.contract]}</span>
                  <span className="tabular">{b.ref}</span>
                </p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-xs text-fg-muted">Your payout</p>
                {b.payoutPaise != null ? <Money paise={b.payoutPaise} className="font-display text-lg font-extrabold" /> : <p className="text-sm font-medium text-fg-muted">Set in contract</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
