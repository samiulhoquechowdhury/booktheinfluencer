'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { LEAD_STAGES } from '@repo/schemas';
import { Skeleton } from '@repo/ui/skeleton';
import { api } from '@/lib/api/client';
import { inr, pct } from '@/lib/format';
import { STAGE_NAMES } from '@/lib/roles';
import type { Analytics } from '@/lib/types';
import { Card, ErrorNote, PageHeader, Stat } from './ui';
import { useUser } from './user-context';

const RANGES = [
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'all', label: 'All time' },
] as const;

const since = (days: number) => new Date(Date.now() - days * 86_400_000 + 330 * 60_000).toISOString().slice(0, 10);

/** ANA-1..3. Finance figures appear only when the API includes them (ACCOUNTS / SUPER_ADMIN). */
export function Overview() {
  const user = useUser();
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('90');
  const [mine, setMine] = useState(false);
  const q = useQuery({
    queryKey: ['analytics', range, mine],
    queryFn: () => api.get<Analytics>('/admin/analytics', { from: range === 'all' ? undefined : since(Number(range)), ownerId: mine ? user.id : undefined }),
  });
  const a = q.data;
  const max = a ? Math.max(1, ...Object.values(a.leadsByStage)) : 1;

  return (
    <>
      <PageHeader
        title={`Hello${user.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Leads created in the selected period."
        actions={
          <>
            <div className="flex rounded-full border border-border p-1" role="group" aria-label="Period">
              {RANGES.map((r) => (
                <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => setRange(r.key)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${range === r.key ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="size-4 accent-[var(--primary)]" /> My leads only
            </label>
          </>
        }
      />
      {q.isError && <ErrorNote error={q.error} onRetry={() => q.refetch()} />}
      {!a && !q.isError && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}
      {a && (
        <div className="grid gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Leads" value={a.leads} />
            <Stat label="Confirmed bookings" value={a.bookingsConfirmed} hint={a.avgHoursToConfirm != null ? `${a.avgHoursToConfirm} h average to confirm` : undefined} />
            <Stat label="GMV" value={inr(a.gmvPaise)} hint={`Avg booking ${inr(a.avgBookingValuePaise)} · incl. GST`} />
            <Stat label="Conversion" value={pct(a.conversion.quoteToConfirmedBps)} hint={`Quote → confirmed · enquiry → quote ${pct(a.conversion.enquiryToQuoteBps)}`} />
          </div>
          {a.finance && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Margin" value={inr(a.finance.marginPaise)} hint="Confirmed bookings" />
              <Stat label="Receivables" value={inr(a.finance.receivablesPaise)} hint="Unpaid customer milestones" />
              <Stat label="Overdue" value={inr(a.finance.overduePaise)} />
              <Stat label="Pending payouts" value={inr(a.finance.pendingPayouts.amountPaise)} hint={`${a.finance.pendingPayouts.count} to pay`} />
            </div>
          )}
          <Card>
            <h2 className="font-semibold">Leads by stage</h2>
            <ul className="mt-4 grid gap-2">
              {LEAD_STAGES.map((s) => (
                <li key={s} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <Link href={`/leads?view=table&stage=${s}`} className="truncate text-fg-muted hover:text-fg">
                    {STAGE_NAMES[s]}
                  </Link>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-full rounded-full bg-brand-gradient" style={{ width: `${(a.leadsByStage[s] / max) * 100}%` }} />
                  </span>
                  <span className="tnum text-right font-medium">{a.leadsByStage[s]}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
