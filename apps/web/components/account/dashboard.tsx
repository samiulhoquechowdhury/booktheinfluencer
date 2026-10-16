'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin, Plus } from 'lucide-react';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { Skeleton } from '@repo/ui/skeleton';
import { EVENT_TYPE_LABELS, STAGE_LABELS, daysUntil, formatDate, formatTime } from '@repo/utils';
import { useDashboard, useSession } from '@/lib/api/hooks';
import { ApiError } from '@/lib/api/client';
import { cityName } from '@/lib/reference';
import { CountUp, Reveal, RevealItem } from '@/lib/motion';

const ACTION_STAGES = new Set(['QUOTE_SENT', 'ADVANCE_PENDING']);

export function Dashboard() {
  const { data: session } = useSession();
  const q = useDashboard();
  const first = session?.name?.split(' ')[0];

  return (
    <div className="pb-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Your bookings</p>
          <h1 className="mt-2 font-display text-display font-black">
            Hi{first ? `, ${first}` : ''}<span className="text-gradient">.</span>
          </h1>
        </div>
        <Button asChild size="lg">
          <Link href="/enquire"><Plus aria-hidden /> New brief</Link>
        </Button>
      </header>

      {q.isLoading ? (
        <div className="mt-12 space-y-4">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
      ) : q.isError ? (
        <EmptyState art="error" title="We couldn’t load your bookings" description={q.error instanceof ApiError ? q.error.message : 'Please try again.'} action={<Button onClick={() => void q.refetch()}>Try again</Button>} />
      ) : !q.data || (q.data.bookings.length === 0 && q.data.briefs.length === 0) ? (
        <EmptyState art="calendar" title="No bookings yet" description="Send a brief and your manager will take it from there." action={<Button asChild><Link href="/enquire">Start a brief</Link></Button>} />
      ) : (
        <>
          <dl className="mt-12 grid grid-cols-3 gap-4 border-y border-border py-6">
            {[
              { label: 'Active', value: q.data.bookings.filter((b) => !['LOST', 'CANCELLED', 'CLOSED'].includes(b.stage) && b.availability !== 'UNAVAILABLE').length },
              { label: 'Need your action', value: q.data.bookings.filter((b) => ACTION_STAGES.has(b.stage)).length },
              { label: 'Confirmed', value: q.data.bookings.filter((b) => b.availability === 'CONFIRMED').length },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-fg-muted sm:text-sm">{s.label}</dt>
                <dd><CountUp value={s.value} className="font-display text-4xl font-black tracking-tight md:text-6xl" /></dd>
              </div>
            ))}
          </dl>

          {q.data.briefs.length > 0 && (
            <section aria-labelledby="briefs-title" className="mt-12">
              <h2 id="briefs-title" className="eyebrow mb-4">Open briefs</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {q.data.briefs.map((b) => (
                  <li key={b.ref} className="rounded-2xl border border-dashed border-border-strong p-5">
                    <p className="tabular text-xs text-fg-muted">{b.ref}</p>
                    <p className="mt-1 font-semibold">{b.event.title}</p>
                    <p className="text-sm text-fg-muted">{formatDate(b.event.date)} · {cityName(b.event.city)}</p>
                    <p className="mt-3 text-sm">Request received — our team is shortlisting talent for you.</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="bookings-title" className="mt-12">
            <h2 id="bookings-title" className="eyebrow mb-4">Bookings</h2>
            <Reveal stagger as="ul" className="space-y-3">
              {q.data.bookings.map((b) => {
                const d = daysUntil(b.event.date);
                const needs = ACTION_STAGES.has(b.stage) && b.availability !== 'UNAVAILABLE';
                return (
                  <RevealItem as="li" key={b.ref}>
                    <Link href={`/account/bookings/${b.ref}`} className="group flex gap-4 rounded-2xl border border-border bg-surface p-3 transition-[border-color,transform] hover:border-border-strong active:scale-[0.995] sm:gap-6 sm:p-4">
                      <span className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl sm:w-28">
                        <Image src={b.talent.image.src} alt={b.talent.image.alt} fill sizes="(min-width: 640px) 112px, 80px" placeholder={b.talent.image.blurDataURL ? 'blur' : 'empty'} blurDataURL={b.talent.image.blurDataURL} className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-1">
                        <span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="tabular text-xs text-fg-muted">{b.ref}</span>
                            {needs && <span className="rounded-full bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] px-2 py-0.5 text-[0.6875rem] font-semibold text-warning">Action needed</span>}
                          </span>
                          <span className="mt-1 block truncate font-display text-xl font-extrabold tracking-tight sm:text-2xl">{b.talent.name}</span>
                          <span className="block truncate text-sm text-fg-muted">{b.event.title} · {EVENT_TYPE_LABELS[b.event.type]}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{formatDate(b.event.date)} · {formatTime(b.event.startTime)}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{cityName(b.event.city)}</span>
                          {d >= 0 && <span className="tabular">in {d} days</span>}
                        </span>
                      </span>
                      <span className="hidden shrink-0 flex-col items-end justify-between py-1 sm:flex">
                        <AvailabilityPill status={b.availability} />
                        <span className="flex items-center gap-1 text-xs text-fg-muted">{STAGE_LABELS[b.stage]} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden /></span>
                      </span>
                    </Link>
                    <div className="mt-2 px-1 sm:hidden"><AvailabilityPill status={b.availability} size="sm" /></div>
                  </RevealItem>
                );
              })}
            </Reveal>
          </section>
        </>
      )}
    </div>
  );
}
