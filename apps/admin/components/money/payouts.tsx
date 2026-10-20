'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@repo/ui/button';
import { DatePicker } from '@repo/ui/date-picker';
import { Skeleton } from '@repo/ui/skeleton';
import { todayIST } from '@repo/utils';
import { api, ApiError, type Page } from '@/lib/api/client';
import { day, inr, parseRupees, rupeesInput, when } from '@/lib/format';
import { RECORD_MONEY, can } from '@/lib/roles';
import type { PayoutRow } from '@/lib/types';
import { Dialog, fieldCls } from '../dialog';
import { ErrorNote, PageHeader } from '../ui';
import { useUser } from '../user-context';
import { useUrlState } from './use-url-state';

const VIEWS = [
  { key: 'PENDING', label: 'To schedule' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'PAID', label: 'Paid' },
  { key: 'ON_HOLD', label: 'On hold' },
] as const;
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
type Action = { kind: 'schedule' | 'adjust' | 'paid'; p: PayoutRow };

/** SET-1..3: talent payouts, created when an event is completed. Talent managers can look; only finance acts. */
export function Payouts() {
  const user = useUser();
  const { sp, set, page } = useUrlState();
  const status = (VIEWS.find((v) => v.key === sp.get('status'))?.key ?? 'PENDING') as PayoutRow['status'];
  const [action, setAction] = useState<Action | null>(null);
  const list = useQuery({
    queryKey: ['payouts', status, page],
    queryFn: () => api.get<Page<PayoutRow>>('/admin/payouts', { status, page, pageSize: 25 }),
    placeholderData: keepPreviousData,
  });
  const canAct = can(user, ...RECORD_MONEY);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Payouts" description="Created when an event is marked completed, for the payout agreed in the accepted quote." />
      <div className="mb-5 flex rounded-full border border-border p-1 sm:w-fit" role="group" aria-label="Status">
        {VIEWS.map((v) => (
          <button key={v.key} type="button" aria-pressed={status === v.key} onClick={() => set({ status: v.key === 'PENDING' ? undefined : v.key })} className={`rounded-full px-3 py-1.5 text-sm font-medium ${status === v.key ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg'}`}>
            {v.label}
          </button>
        ))}
      </div>
      {list.isError ? (
        <ErrorNote error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : !list.data.items.length ? (
        <p className="rounded-2xl border border-border p-8 text-center text-sm text-fg-muted">Nothing here.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="tnum w-full min-w-[56rem] text-sm">
              <thead className="bg-surface text-left text-xs text-fg-muted">
                <tr>
                  {['Talent', 'Booking', 'Event', 'Amount', status === 'PAID' ? 'Paid' : 'Scheduled for', ''].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.talent.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {p.bookingRef}
                      <span className="block text-fg-subtle">{p.leadRef}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{day(p.eventDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium">{inr(p.amountPaise)}</span>
                      {p.contractedPaise && p.contractedPaise !== p.amountPaise && <span className="block text-xs text-warning">contracted {inr(p.contractedPaise)}</span>}
                      {p.note && <span className="block max-w-56 truncate text-xs text-fg-muted" title={p.note}>{p.note}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.status === 'PAID' ? (
                        <>
                          {p.paidAt ? when(p.paidAt) : '—'}
                          <span className="block font-mono text-xs text-fg-subtle">{p.reference}</span>
                        </>
                      ) : p.scheduledFor ? (
                        day(p.scheduledFor)
                      ) : (
                        <span className="text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canAct && (p.status === 'PENDING' || p.status === 'SCHEDULED') && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'adjust', p })}>
                            Adjust
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAction({ kind: 'schedule', p })}>
                            Schedule
                          </Button>
                          <Button size="sm" onClick={() => setAction({ kind: 'paid', p })}>
                            Mark paid
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
            <span className="tnum">
              {list.data.total} payout{list.data.total === 1 ? '' : 's'} · page {list.data.page} of {pages}
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
      {action && <PayoutAction action={action} onClose={() => setAction(null)} />}
    </>
  );
}

function PayoutAction({ action: { kind, p }, onClose }: { action: Action; onClose: () => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(kind === 'schedule' ? (p.scheduledFor ?? todayIST()) : todayIST());
  const [reference, setReference] = useState('');
  const [rupees, setRupees] = useState(rupeesInput(p.amountPaise));
  const [note, setNote] = useState('');
  const paise = parseRupees(rupees);
  const run = useMutation({
    mutationFn: () =>
      kind === 'schedule'
        ? api.post(`/admin/payouts/${p.id}/schedule`, { scheduledFor: date })
        : kind === 'adjust'
          ? api.patch(`/admin/payouts/${p.id}`, { amountPaise: paise!.toString(), note: note.trim() })
          : api.post(`/admin/payouts/${p.id}/paid`, { reference: reference.trim(), paidOn: date }),
    onSuccess: () => {
      toast.success(kind === 'paid' ? 'Payout marked paid' : kind === 'schedule' ? 'Payout scheduled' : 'Amount updated');
      void qc.invalidateQueries({ queryKey: ['payouts'] });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const title = kind === 'schedule' ? 'Schedule payout' : kind === 'adjust' ? 'Adjust payout' : 'Mark payout paid';
  const valid = kind === 'paid' ? reference.trim().length >= 4 : kind === 'adjust' ? paise != null && note.trim().length >= 3 : Boolean(date);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} title={title} description={`${p.talent.name} · ${p.bookingRef} · ${inr(p.amountPaise)}`}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) run.mutate();
        }}
      >
        {kind === 'adjust' ? (
          <>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-fg-muted">New amount (₹)</span>
              <input inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} className={`${fieldCls} tnum`} />
            </label>
            <input required aria-label="Reason" placeholder="Reason, e.g. agreed deduction for late arrival" value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} />
            <p className="text-xs text-fg-muted">The reason is kept on the payout and in the audit log; the final margin uses the amount actually paid.</p>
          </>
        ) : (
          <>
            {kind === 'paid' && <input required minLength={4} aria-label="Bank reference" placeholder="NEFT / UTR reference" value={reference} onChange={(e) => setReference(e.target.value)} className={fieldCls} />}
            <DatePicker aria-label={kind === 'paid' ? 'Paid on' : 'Pay on'} value={date} min={kind === 'schedule' ? todayIST() : undefined} clearable={false} onChange={setDate} />
          </>
        )}
        <Button type="submit" disabled={!valid || run.isPending}>
          {run.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : title}
        </Button>
      </form>
    </Dialog>
  );
}
