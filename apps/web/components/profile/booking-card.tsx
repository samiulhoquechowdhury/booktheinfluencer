'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, ShieldCheck } from 'lucide-react';
import { DatePicker } from '@repo/ui/date-picker';
import type { PublicTalent } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { FeeBand } from '@repo/ui/fee-band';
import { ctaLabelForTier } from '@repo/utils';
import { Magnetic } from '@/lib/motion';

export const QUOTE_INCLUDES = ['Talent fee for the agreed set', 'Travel, stay and local transport (if needed)', 'Production and rider requirements', 'Service fee and GST — itemised'];

export const enquireHref = (t: PublicTalent, date?: string, extra?: { eventType?: string; city?: string }) => {
  const sp = new URLSearchParams({ talent: t.slug });
  if (date) sp.set('date', date);
  if (extra?.eventType) sp.set('eventType', extra.eventType);
  if (extra?.city) sp.set('city', extra.city);
  return `/enquire?${sp}`;
};

/** Sticky booking card (desktop). CTA: "Check Availability" (premium) / "Request to Book". */
export function BookingCard({ talent }: { talent: PublicTalent }) {
  const [date, setDate] = useState('');
  const cta = ctaLabelForTier(talent.tier);
  return (
    <div className="glass rounded-2xl p-6 shadow-float">
      <p className="eyebrow">Indicative fee</p>
      <FeeBand band={talent.feeBand} size="lg" withInfo className="mt-2" />
      <ul className="mt-5 space-y-2 border-t border-border pt-5" aria-label="What’s included in a quote">
        <li className="text-xs font-semibold tracking-wide text-fg-muted uppercase">What’s included in a quote</li>
        {QUOTE_INCLUDES.map((x) => (
          <li key={x} className="flex gap-2 text-sm text-fg-muted">
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            {x}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <label htmlFor="bc-date" className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
          <CalendarDays className="size-3.5" aria-hidden /> Event date
        </label>
        <DatePicker id="bc-date" value={date} onChange={setDate} placeholder="When’s the event?" />
      </div>
      <Magnetic className="mt-5 flex">
        <Button asChild size="lg" className="w-full">
          <Link href={enquireHref(talent, date || undefined)}>
            {cta} <ArrowRight aria-hidden />
          </Link>
        </Button>
      </Magnetic>
      <p className="mt-4 flex gap-2 text-xs text-fg-subtle">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        Free to request. We confirm the date with the authorised representative before anything is booked.
      </p>
    </div>
  );
}
