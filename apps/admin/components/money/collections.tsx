'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@repo/ui/button';
import { DatePicker } from '@repo/ui/date-picker';
import { Select } from '@repo/ui/select';
import { Skeleton } from '@repo/ui/skeleton';
import { todayIST } from '@repo/utils';
import { api, ApiError, type Page } from '@/lib/api/client';
import { day, inr, parseRupees, rupeesInput, when } from '@/lib/format';
import { RECORD_MONEY, can } from '@/lib/roles';
import type { MilestoneRow } from '@/lib/types';
import { Dialog, fieldCls } from '../dialog';
import { ErrorNote, PageHeader } from '../ui';
import { useUser } from '../user-context';
import { useUrlState } from './use-url-state';

const VIEWS = [
  { key: 'due', label: 'Due' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
] as const;
type Meta = { overdue: { count: number; amountPaise: string } };
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

function StatusCell({ m }: { m: MilestoneRow }) {
  if (m.status === 'PAID')
    return (
      <span className="text-success">
        Paid {m.paidAt ? when(m.paidAt) : ''}
        {m.receiptNo && <span className="block font-mono text-xs text-fg-subtle">{m.receiptNo}</span>}
      </span>
    );
  if (m.status === 'CANCELLED' || m.status === 'REFUNDED') return <span className="text-fg-subtle">{m.status === 'CANCELLED' ? 'Cancelled' : 'Refunded'}</span>;
  if (m.overdue) return <span className="font-medium text-danger">Overdue</span>;
  return <span className="text-fg-muted">{m.linkSent ? 'Link sent' : 'Not requested yet'}</span>;
}

/** design.md /payments: what customers owe and what came in. Only finance records offline payments (PAY-4). */
export function Collections() {
  const user = useUser();
  const { sp, set, page } = useUrlState();
  const view = (VIEWS.find((v) => v.key === sp.get('view'))?.key ?? 'due') as (typeof VIEWS)[number]['key'];
  const bookingId = sp.get('bookingId') ?? undefined;
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [recording, setRecording] = useState<MilestoneRow | null>(null);
  useEffect(() => {
    const t = setTimeout(() => (sp.get('q') ?? '') !== q.trim() && set({ q: q.trim() || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const list = useQuery({
    queryKey: ['milestones', view, bookingId, sp.get('q'), page],
    queryFn: () => api.get<Page<MilestoneRow, Meta>>('/admin/milestones', { view, bookingId, q: sp.get('q'), page, pageSize: 25 }),
    placeholderData: keepPreviousData,
  });
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const canRecord = can(user, ...RECORD_MONEY);

  return (
    <>
      <PageHeader
        title="Payments"
        description={list.data && list.data.overdue.count > 0 ? <span className="text-danger">{list.data.overdue.count} overdue · {inr(list.data.overdue.amountPaise)}</span> : 'Customer payment milestones across bookings.'}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-border p-1" role="group" aria-label="View">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => set({ view: v.key === 'due' ? undefined : v.key })} className={`rounded-full px-3 py-1.5 text-sm font-medium ${view === v.key ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg'}`}>
              {v.label}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ref, customer, receipt" className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm outline-none focus:border-primary-text" />
        </label>
        {bookingId && (
          <button type="button" onClick={() => set({ bookingId: undefined })} className="rounded-full border border-border px-3 py-1.5 text-sm text-fg-muted hover:text-fg">
            One booking only ✕
          </button>
        )}
      </div>
      {list.isError ? (
        <ErrorNote error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !list.data.items.length ? (
        <p className="rounded-2xl border border-border p-8 text-center text-sm text-fg-muted">{view === 'overdue' ? 'Nothing overdue.' : 'No payments match.'}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="tnum w-full min-w-[56rem] text-sm">
              <thead className="bg-surface text-left text-xs text-fg-muted">
                <tr>
                  {['Due', 'Customer', 'Talent / booking', 'Milestone', 'Amount', 'Status', ''].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.items.map((m) => (
                  <tr key={m.id} className={m.overdue ? 'bg-danger/5' : undefined}>
                    <td className="px-4 py-3 whitespace-nowrap">{day(m.dueDate)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${m.lead.id}`} className="font-medium hover:underline">
                        {m.lead.customer ?? 'Customer'}
                      </Link>
                      <span className="block font-mono text-xs text-fg-subtle">{m.lead.ref}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.booking.talent}
                      <span className="block font-mono text-xs text-fg-subtle">{m.booking.ref}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.label}
                      {m.isAdvance && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">advance</span>}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{inr(m.amountPaise)}</td>
                    <td className="px-4 py-3">
                      <StatusCell m={m} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRecord && m.status !== 'PAID' && m.status !== 'CANCELLED' && m.status !== 'REFUNDED' && (
                        <Button size="sm" variant="outline" onClick={() => setRecording(m)}>
                          Record payment
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
            <span className="tnum">
              {list.data.total} milestone{list.data.total === 1 ? '' : 's'} · page {list.data.page} of {pages}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
                Previous
              </button>
              <button type="button" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {recording && <RecordPayment m={recording} onClose={() => setRecording(null)} />}
    </>
  );
}

/** PAY-4: a bank transfer / UPI / cheque / cash payment, with its reference. Gateway payments arrive by webhook. */
function RecordPayment({ m, onClose }: { m: MilestoneRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [rupees, setRupees] = useState(rupeesInput(m.amountPaise));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [receivedOn, setReceivedOn] = useState(todayIST());
  const [note, setNote] = useState('');
  const paise = parseRupees(rupees);
  const save = useMutation({
    mutationFn: () => api.post(`/admin/milestones/${m.id}/payments`, { amountPaise: paise!.toString(), method, reference: reference.trim(), receivedOn, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: () => {
      toast.success('Payment recorded');
      void qc.invalidateQueries({ queryKey: ['milestones'] });
      void qc.invalidateQueries({ queryKey: ['lead', m.lead.id] });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} title="Record a payment" description={`${m.label} · ${m.booking.talent} · ${m.lead.customer ?? ''} — due ${inr(m.amountPaise)}`}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (paise && paise > 0n) save.mutate();
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-fg-muted">Amount received (₹)</span>
          <input inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} className={`${fieldCls} tnum`} />
          {paise != null && paise < BigInt(m.amountPaise) && <span className="text-xs text-warning">Less than due: the milestone stays open until the rest arrives.</span>}
        </label>
        <Select aria-label="Method" value={method} onValueChange={setMethod} options={[{ value: 'bank_transfer', label: 'Bank transfer' }, { value: 'upi', label: 'UPI' }, { value: 'cheque', label: 'Cheque' }, { value: 'cash', label: 'Cash' }]} />
        <input required minLength={4} aria-label="Reference" placeholder="UTR / cheque number" value={reference} onChange={(e) => setReference(e.target.value)} className={fieldCls} />
        <DatePicker aria-label="Received on" value={receivedOn} clearable={false} onChange={setReceivedOn} />
        <input aria-label="Note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} />
        <p className="text-xs text-fg-muted">Proof upload arrives with the storage provider; keep the bank confirmation until then.</p>
        <Button type="submit" disabled={!paise || paise <= 0n || reference.trim().length < 4 || save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : 'Record payment'}
        </Button>
      </form>
    </Dialog>
  );
}
