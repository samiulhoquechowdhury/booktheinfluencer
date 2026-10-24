'use client';

import { ArrowRight, Check, Clock, ShieldCheck } from 'lucide-react';
import type { PublicTalent } from '@repo/schemas';
import { FeeBand } from '@repo/ui/fee-band';
import { ctaLabelForTier } from '@repo/utils';
import { openBookingPanel } from './booking-dock';

export const QUOTE_INCLUDES = ['Talent fee for the agreed set', 'Travel, stay and local transport (if needed)', 'Production and rider requirements', 'Service fee and GST — itemised'];

export const enquireHref = (t: PublicTalent, date?: string, extra?: { eventType?: string; city?: string }) => {
  const sp = new URLSearchParams({ talent: t.slug });
  if (date) sp.set('date', date);
  if (extra?.eventType) sp.set('eventType', extra.eventType);
  if (extra?.city) sp.set('city', extra.city);
  return `/enquire?${sp}`;
};

/** Sticky sidebar card (large screens): fee, what a quote covers and the primary action, which opens the booking panel. */
export function BookingCard({ talent }: { talent: PublicTalent }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <p className="text-sm text-fg-muted">Indicative fee</p>
      <FeeBand band={talent.feeBand} size="lg" withInfo className="mt-1" />

      <button
        type="button"
        onClick={openBookingPanel}
        className="group mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient font-semibold text-primary-fg shadow-[0_14px_34px_-14px_var(--glow-1)] transition-transform active:scale-[0.98]"
      >
        {ctaLabelForTier(talent.tier)}
        <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
      </button>
      <p className="mt-3 flex items-center justify-center gap-4 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" aria-hidden /> Free to request</span>
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden /> Reply in 24h</span>
      </p>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-sm font-semibold">Your quote includes</p>
        <ul className="mt-3 space-y-2">
          {QUOTE_INCLUDES.map((x) => (
            <li key={x} className="flex gap-2 text-sm text-fg-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {x}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-5 text-xs text-fg-muted">Fees and availability are confirmed with the authorised representative before anything is booked.</p>
    </div>
  );
}
