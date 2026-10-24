import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import type { CustomerBookingSummary } from '@repo/schemas';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { EVENT_TYPE_LABELS, STAGE_LABELS, formatDate } from '@repo/utils';
import { cityName } from '@/lib/reference';

export const ACTION_STAGES = new Set(['QUOTE_SENT', 'ADVANCE_PENDING']);
const ENDED = new Set(['EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED', 'LOST', 'CANCELLED']);

export const needsAction = (b: CustomerBookingSummary) => ACTION_STAGES.has(b.stage) && b.availability !== 'UNAVAILABLE';
export const isActive = (b: CustomerBookingSummary) => !ENDED.has(b.stage) && b.availability !== 'UNAVAILABLE';
export const actionLabel = (b: CustomerBookingSummary) => (b.stage === 'QUOTE_SENT' ? 'Review quote' : 'Pay advance');

/** One booking as a list row: talent photo, event, date and city, status. */
export function BookingRow({ b }: { b: CustomerBookingSummary }) {
  return (
    <Link href={`/account/bookings/${b.ref}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-surface-2 sm:p-5">
      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-16">
        <Image src={b.talent.image.src} alt="" fill sizes="64px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{b.talent.name}</span>
          {needsAction(b) && <span className="rounded-full bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] px-2 py-0.5 text-[0.6875rem] font-semibold text-warning">{actionLabel(b)}</span>}
        </span>
        <span className="mt-0.5 block truncate text-sm text-fg-muted">{b.event.title} · {EVENT_TYPE_LABELS[b.event.type]}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span>{formatDate(b.event.date)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{cityName(b.event.city)}</span>
          <span className="tabular">{b.ref}</span>
        </span>
      </span>
      <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
        <AvailabilityPill status={b.availability} size="sm" />
        <span className="text-xs text-fg-muted">{STAGE_LABELS[b.stage]}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
