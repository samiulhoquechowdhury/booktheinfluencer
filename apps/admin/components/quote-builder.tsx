'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LINE_ITEM_TYPES } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { DatePicker } from '@repo/ui/date-picker';
import { Select } from '@repo/ui/select';
import { Skeleton } from '@repo/ui/skeleton';
import { AVAILABILITY_LABELS, LINE_ITEM_LABELS, calculateQuote, milestoneAmounts, todayIST } from '@repo/utils';
import { api, ApiError } from '@/lib/api/client';
import { day, inr, pct, titleCase, when } from '@/lib/format';
import { BUILD_QUOTES, SEE_FINANCE, SEE_PAYOUT, can } from '@/lib/roles';
import type { BookingQuotes, QuoteView } from '@/lib/types';
import { Card, ErrorNote, PageHeader } from './ui';
import { useUser } from './user-context';

type LineType = (typeof LINE_ITEM_TYPES)[number];
type DraftLine = { key: string; id?: string; type: LineType; description: string; amount: string; payout: string; cost: string };
type DraftMilestone = { key: string; label: string; percent: string; dueDate: string };
type Draft = { validUntil: string; gst: string; lines: DraftLine[]; milestones: DraftMilestone[]; inclusions: string; notes: string };

const EDITABLE = new Set(['DRAFT', 'PENDING_APPROVAL']);
const REASON_TEXT: Record<string, string> = { BELOW_MINIMUM_RATE: 'Talent fee is below the minimum rate', MARGIN_BELOW_FLOOR: 'Margin is below the floor' };
const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-surface-2 text-fg-muted',
  PENDING_APPROVAL: 'bg-warning/15 text-warning',
  SENT: 'bg-info/15 text-info',
  ACCEPTED: 'bg-success/15 text-success',
  REJECTED: 'bg-danger/10 text-danger',
  EXPIRED: 'bg-surface-2 text-fg-subtle',
  SUPERSEDED: 'bg-surface-2 text-fg-subtle',
};
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000 + 330 * 60_000).toISOString().slice(0, 10);
let keySeq = 0;
const key = () => `k${++keySeq}`;
/** YYYY-MM-DD of an instant, in IST. */
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);
const rupeesOf = (paise: string | null | undefined) => (paise == null ? '' : String(BigInt(paise) / 100n));
const toPaise = (rupees: string) => (/^\d+$/.test(rupees.trim()) ? BigInt(rupees.trim()) * 100n : 0n);
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

function draftFrom(q: QuoteView | undefined, withIds: boolean, sellingRupees?: number): Draft {
  if (!q)
    return {
      validUntil: plusDays(14),
      gst: '18',
      lines: [{ key: key(), type: 'TALENT_FEE', description: 'Performance fee', amount: sellingRupees ? String(sellingRupees) : '', payout: '', cost: '' }],
      milestones: [
        { key: key(), label: 'Advance', percent: '50', dueDate: plusDays(3) },
        { key: key(), label: 'Balance', percent: '50', dueDate: plusDays(30) },
      ],
      inclusions: '',
      notes: '',
    };
  return {
    validUntil: istDay(q.validUntil) < todayIST() ? plusDays(14) : istDay(q.validUntil),
    gst: String(q.gstBps / 100),
    lines: q.lines.map((l) => ({ key: key(), id: withIds ? l.id : undefined, type: l.type as LineType, description: l.description, amount: rupeesOf(l.amountPaise), payout: rupeesOf(l.payoutPaise), cost: rupeesOf(l.internalCostPaise) })),
    milestones: q.milestones.map((m) => ({ key: key(), label: m.label, percent: String(m.percentBps / 100), dueDate: m.dueDate })),
    inclusions: q.inclusions.join('\n'),
    notes: q.notes ?? '',
  };
}

/** QUO-1..6: versions for one booking, the builder with live totals, send and approval. */
export function QuoteBuilder({ bookingId }: { bookingId: string }) {
  const q = useQuery({ queryKey: ['quotes', bookingId], queryFn: () => api.get<BookingQuotes>(`/admin/bookings/${bookingId}/quotes`) });
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-96 rounded-2xl" />;
  return <Loaded data={q.data} />;
}

function Loaded({ data }: { data: BookingQuotes }) {
  const user = useUser();
  const qc = useQueryClient();
  const canBuild = can(user, ...BUILD_QUOTES);
  const latest = data.quotes[0];
  const accepted = data.quotes.some((x) => x.status === 'ACCEPTED');
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(latest ? latest.id : canBuild ? 'new' : null);
  const selected = data.quotes.find((x) => x.id === selectedId);
  const editing = selectedId === 'new' || (selected && EDITABLE.has(selected.status) && canBuild);

  const refresh = (next?: QuoteView) => {
    void qc.invalidateQueries({ queryKey: ['quotes', data.booking.id] });
    void qc.invalidateQueries({ queryKey: ['lead', data.booking.lead.id] });
    if (next) setSelectedId(next.id);
  };

  return (
    <>
      <Link href={`/leads/${data.booking.lead.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {data.booking.lead.ref}
      </Link>
      <PageHeader
        title={`Quotes · ${data.booking.talent.name}`}
        description={
          <>
            <span className="font-mono">{data.booking.ref}</span> · {AVAILABILITY_LABELS[data.booking.availability as keyof typeof AVAILABILITY_LABELS]?.label ?? titleCase(data.booking.availability)}
          </>
        }
        actions={
          canBuild &&
          !accepted &&
          selectedId !== 'new' && (
            <Button size="sm" variant="outline" onClick={() => setSelectedId('new')}>
              <Plus aria-hidden /> New version
            </Button>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-[16rem_1fr]">
        <aside className="grid content-start gap-4">
          {data.rateCard && (
            <Card className="p-4 text-sm">
              <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">Rate card{data.rateCard.eventType ? ` · ${titleCase(data.rateCard.eventType)}` : ''}</p>
              <dl className="tnum mt-2 grid gap-1">
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Minimum</dt>
                  <dd className="font-medium">{inr(String(BigInt(data.rateCard.minimumRupees) * 100n))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Selling</dt>
                  <dd className="font-medium">{inr(String(BigInt(data.rateCard.sellingRupees) * 100n))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Commission</dt>
                  <dd className="font-medium">{pct(data.rateCard.commissionBps)}</dd>
                </div>
                {data.marginFloorBps != null && (
                  <div className="flex justify-between">
                    <dt className="text-fg-muted">Margin floor</dt>
                    <dd className="font-medium">{pct(data.marginFloorBps)}</dd>
                  </div>
                )}
              </dl>
            </Card>
          )}
          <nav aria-label="Versions" className="grid gap-2">
            {selectedId === 'new' && <span className="rounded-xl border border-primary-text bg-surface px-3 py-2 text-sm font-semibold">New version</span>}
            {data.quotes.map((v) => (
              <button key={v.id} type="button" onClick={() => setSelectedId(v.id)} aria-current={v.id === selectedId ? 'true' : undefined} className={`rounded-xl border px-3 py-2 text-left text-sm ${v.id === selectedId ? 'border-primary-text bg-surface' : 'border-border hover:border-border-strong'}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">v{v.version}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[v.status]}`}>{titleCase(v.status)}</span>
                </span>
                <span className="tnum mt-1 block text-xs text-fg-muted">
                  {inr(v.totalPaise)}
                  {v.sentAt ? ` · sent ${when(v.sentAt)}` : ''}
                </span>
              </button>
            ))}
            {!data.quotes.length && selectedId !== 'new' && <p className="text-sm text-fg-muted">No quotes yet.</p>}
          </nav>
        </aside>
        <div className="min-w-0">
          {editing ? (
            <Editor key={selectedId} data={data} quote={selectedId === 'new' ? undefined : selected} base={selectedId === 'new' ? latest : selected} onSaved={refresh} onCancel={() => setSelectedId(latest?.id ?? null)} />
          ) : selected ? (
            <ReadOnly q={selected} onChanged={refresh} />
          ) : (
            <p className="text-sm text-fg-muted">Nothing to show.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Editor({ data, quote, base, onSaved, onCancel }: { data: BookingQuotes; quote?: QuoteView; base?: QuoteView; onSaved: (q?: QuoteView) => void; onCancel: () => void }) {
  const user = useUser();
  const payout = can(user, ...SEE_PAYOUT);
  const finance = can(user, ...SEE_FINANCE);
  // A new version starts from the latest one, keeping line ids so hidden payout / cost carry over.
  const [d, setD] = useState<Draft>(() => draftFrom(base, Boolean(base), data.rateCard?.sellingRupees));
  const [dirty, setDirty] = useState(!quote);
  const update = (patch: Partial<Draft>) => (setD((x) => ({ ...x, ...patch })), setDirty(true));
  const setLine = (k: string, patch: Partial<DraftLine>) => update({ lines: d.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) });
  const setMilestone = (k: string, patch: Partial<DraftMilestone>) => update({ milestones: d.milestones.map((m) => (m.key === k ? { ...m, ...patch } : m)) });

  const gstBps = Math.round(Number(d.gst) * 100) || 0;
  const totals = useMemo(
    () =>
      calculateQuote(
        d.lines.map((l) => ({ type: l.type, customerAmountPaise: toPaise(l.amount), internalCostPaise: toPaise(l.cost), payoutPaise: l.payout.trim() ? toPaise(l.payout) : null, taxRateBps: gstBps })),
      ),
    [d.lines, gstBps],
  );
  const plan = d.milestones.map((m) => ({ percentBps: Math.round(Number(m.percent) * 100) || 0 }));
  const planOk = plan.reduce((a, m) => a + m.percentBps, 0) === 10_000;
  const amounts = planOk ? milestoneAmounts(totals.totalPaise, plan) : [];

  const body = () => ({
    validUntil: d.validUntil,
    gstBps,
    lines: d.lines.map((l) => ({
      ...(l.id ? { id: l.id } : {}),
      type: l.type,
      description: l.description,
      amountRupees: Number(l.amount) || 0,
      // Only send what this role may set; the API keeps the rest from the matching line.
      ...(payout && l.type === 'TALENT_FEE' ? { payoutRupees: l.payout.trim() ? Number(l.payout) : null } : {}),
      ...(finance ? { internalCostRupees: Number(l.cost) || 0 } : {}),
    })),
    milestones: d.milestones.map((m, i) => ({ label: m.label, percentBps: plan[i]!.percentBps, dueDate: m.dueDate })),
    inclusions: d.inclusions.split('\n').map((s) => s.trim()).filter(Boolean),
    notes: d.notes.trim() || null,
  });

  const save = useMutation({
    mutationFn: () => (quote ? api.put<QuoteView>(`/admin/quotes/${quote.id}`, body()) : api.post<QuoteView>(`/admin/bookings/${data.booking.id}/quotes`, body())),
    onSuccess: (q) => (setDirty(false), toast.success(quote ? 'Quote saved' : `Version ${q.version} created`), onSaved(q)),
    onError: (e) => toast.error(errMsg(e)),
  });
  const send = useMutation({
    mutationFn: () => api.post<QuoteView>(`/admin/quotes/${quote!.id}/send`),
    onSuccess: (q) => (toast.success(q.status === 'PENDING_APPROVAL' ? 'Sent for approval' : 'Quote sent to the customer'), onSaved(q)),
    onError: (e) => toast.error(errMsg(e)),
  });

  const cols = `10rem 1fr 8rem${payout ? ' 8rem' : ''}${finance ? ' 8rem' : ''} 2.5rem`;
  const input = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary-text';
  const money = `${input} tnum text-right`;

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      {quote?.status === 'PENDING_APPROVAL' && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Waiting for super-admin approval: {quote.approval.reasons.map((r) => REASON_TEXT[r] ?? r).join('; ')}. Saving changes returns it to draft.
        </p>
      )}
      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-fg-muted">Valid until</span>
            <DatePicker aria-label="Valid until" value={d.validUntil} min={todayIST()} clearable={false} onChange={(v) => update({ validUntil: v })} />
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-fg-muted">GST %</span>
            <input inputMode="decimal" value={d.gst} onChange={(e) => update({ gst: e.target.value })} className={money} />
          </label>
        </div>
      </Card>

      <Card className="grid gap-3">
        <h2 className="font-semibold">Line items</h2>
        <div className="hidden gap-2 text-xs text-fg-muted md:grid" style={{ gridTemplateColumns: cols }}>
          <span>Type</span>
          <span>Description</span>
          <span className="text-right">Customer ₹</span>
          {payout && <span className="text-right">Payout ₹</span>}
          {finance && <span className="text-right">Internal cost ₹</span>}
          <span />
        </div>
        {d.lines.map((l) => (
          <div key={l.key} className="grid gap-2 md:items-center md:[grid-template-columns:var(--cols)]" style={{ ['--cols' as string]: cols }}>
            <Select aria-label="Line type" value={l.type} onValueChange={(v) => setLine(l.key, { type: v as LineType })} options={LINE_ITEM_TYPES.map((t) => ({ value: t, label: LINE_ITEM_LABELS[t] }))} />
            <input aria-label="Description" value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} className={input} />
            <input aria-label="Customer amount in rupees" inputMode="numeric" value={l.amount} onChange={(e) => setLine(l.key, { amount: e.target.value.replace(/\D/g, '') })} className={money} />
            {payout && (l.type === 'TALENT_FEE' ? <input aria-label="Talent payout in rupees" inputMode="numeric" placeholder="Required" value={l.payout} onChange={(e) => setLine(l.key, { payout: e.target.value.replace(/\D/g, '') })} className={money} /> : <span className="hidden md:block" />)}
            {finance && <input aria-label="Internal cost in rupees" inputMode="numeric" value={l.cost} onChange={(e) => setLine(l.key, { cost: e.target.value.replace(/\D/g, '') })} className={money} />}
            <button type="button" aria-label="Remove line" disabled={d.lines.length === 1} onClick={() => update({ lines: d.lines.filter((x) => x.key !== l.key) })} className="grid size-10 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-danger disabled:opacity-30">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" className="justify-self-start" onClick={() => update({ lines: [...d.lines, { key: key(), type: 'OTHER', description: '', amount: '', payout: '', cost: '' }] })}>
          <Plus aria-hidden /> Add line
        </Button>
        <dl className="tnum ml-auto grid w-full max-w-xs gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">Subtotal</dt>
            <dd>{inr(totals.subtotalPaise.toString())}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">GST</dt>
            <dd>{inr(totals.taxPaise.toString())}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{inr(totals.totalPaise.toString())}</dd>
          </div>
          {finance && (
            <div className={`flex justify-between ${data.marginFloorBps != null && totals.marginBps < data.marginFloorBps ? 'text-warning' : 'text-success'}`}>
              <dt>Margin</dt>
              <dd>
                {inr(totals.marginPaise.toString())} · {pct(totals.marginBps)}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="grid gap-3">
        <h2 className="font-semibold">Payment schedule</h2>
        {d.milestones.map((m, i) => (
          <div key={m.key} className="grid gap-2 sm:grid-cols-[1fr_6rem_12rem_8rem_2.5rem] sm:items-center">
            <input aria-label="Milestone label" value={m.label} onChange={(e) => setMilestone(m.key, { label: e.target.value })} className={input} />
            <label className="relative">
              <span className="sr-only">Percent</span>
              <input inputMode="decimal" value={m.percent} onChange={(e) => setMilestone(m.key, { percent: e.target.value })} className={`${money} pr-7`} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-fg-subtle">%</span>
            </label>
            <DatePicker aria-label="Due date" value={m.dueDate} min={todayIST()} clearable={false} onChange={(v) => setMilestone(m.key, { dueDate: v })} />
            <span className="tnum text-right text-sm">{planOk ? inr(amounts[i]!.toString()) : '—'}</span>
            <button type="button" aria-label="Remove milestone" disabled={d.milestones.length === 1} onClick={() => update({ milestones: d.milestones.filter((x) => x.key !== m.key) })} className="grid size-10 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-danger disabled:opacity-30">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" size="sm" variant="ghost" disabled={d.milestones.length >= 6} onClick={() => update({ milestones: [...d.milestones, { key: key(), label: 'Instalment', percent: '0', dueDate: plusDays(30) }] })}>
            <Plus aria-hidden /> Add milestone
          </Button>
          {!planOk && <p className="text-sm font-medium text-danger">Percentages must add up to 100%.</p>}
        </div>
        <p className="text-xs text-fg-muted">The first milestone is the advance; the booking confirms only after it’s paid.</p>
      </Card>

      <Card className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-fg-muted">Inclusions (one per line, shown to the customer)</span>
          <textarea rows={4} value={d.inclusions} onChange={(e) => update({ inclusions: e.target.value })} className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary-text" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-fg-muted">Notes for the customer</span>
          <textarea rows={4} value={d.notes} onChange={(e) => update({ notes: e.target.value })} className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary-text" />
        </label>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {!quote && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant={quote && !dirty ? 'outline' : 'primary'} disabled={save.isPending || !planOk || (Boolean(quote) && !dirty)}>
          {save.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : quote ? 'Save changes' : 'Create draft'}
        </Button>
        {quote?.status === 'DRAFT' && (
          <Button type="button" disabled={dirty || send.isPending} onClick={() => send.mutate()} title={dirty ? 'Save your changes first' : undefined}>
            {send.isPending ? <Loader2 className="animate-spin" aria-label="Sending" /> : 'Send to customer'}
          </Button>
        )}
      </div>
    </form>
  );
}

function ReadOnly({ q, onChanged }: { q: QuoteView; onChanged: (q?: QuoteView) => void }) {
  const user = useUser();
  const [note, setNote] = useState('');
  const decide = useMutation({
    mutationFn: (action: 'approve' | 'return') => api.post<QuoteView>(`/admin/quotes/${q.id}/${action}`, note.trim() ? { note: note.trim() } : {}),
    onSuccess: (next) => (toast.success(next.status === 'SENT' ? 'Approved and sent' : 'Returned to draft'), onChanged(next)),
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div className="grid gap-6">
      {q.status === 'PENDING_APPROVAL' && can(user, 'SUPER_ADMIN') && (
        <Card className="grid gap-3 border-warning/40">
          <p className="flex items-start gap-2 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> Needs your approval: {q.approval.reasons.map((r) => REASON_TEXT[r] ?? r).join('; ')}.
          </p>
          <input aria-label="Note (optional)" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary-text" />
          <div className="flex gap-2">
            <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate('approve')}>
              Approve and send
            </Button>
            <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate('return')}>
              Return to draft
            </Button>
          </div>
        </Card>
      )}
      {q.changeRequest && (
        <Card>
          <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">Customer asked for changes</p>
          <p className="mt-2 text-sm whitespace-pre-line">{q.changeRequest}</p>
        </Card>
      )}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Version {q.version}</h2>
          <p className="text-sm text-fg-muted">
            Valid until {day(q.validUntil)}
            {q.sentAt ? ` · sent ${when(q.sentAt)}` : ''}
            {q.acceptedAt ? ` · accepted ${when(q.acceptedAt)}` : ''}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="tnum w-full min-w-[32rem] text-sm">
            <thead className="text-left text-xs text-fg-muted">
              <tr>
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Customer</th>
                {'payoutTotalPaise' in q && <th className="py-2 text-right font-medium">Payout</th>}
                {'internalCostPaise' in q && <th className="py-2 text-right font-medium">Cost</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {q.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2">
                    <span className="block font-medium">{l.description}</span>
                    <span className="text-xs text-fg-muted">{LINE_ITEM_LABELS[l.type as LineType] ?? l.type}</span>
                  </td>
                  <td className="py-2 text-right">{inr(l.amountPaise)}</td>
                  {'payoutTotalPaise' in q && <td className="py-2 text-right">{l.type === 'TALENT_FEE' ? inr(l.payoutPaise) : ''}</td>}
                  {'internalCostPaise' in q && <td className="py-2 text-right">{inr(l.internalCostPaise)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="tnum mt-4 ml-auto grid max-w-xs gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">Subtotal</dt>
            <dd>{inr(q.subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">GST {pct(q.gstBps)}</dt>
            <dd>{inr(q.taxPaise)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{inr(q.totalPaise)}</dd>
          </div>
          {q.marginPaise != null && (
            <div className="flex justify-between text-success">
              <dt>Margin</dt>
              <dd>
                {inr(q.marginPaise)} · {pct(q.marginBps ?? 0)}
              </dd>
            </div>
          )}
        </dl>
      </Card>
      <Card>
        <h2 className="font-semibold">Payment schedule</h2>
        <ul className="tnum mt-3 grid gap-2 text-sm">
          {q.milestones.map((m) => (
            <li key={m.label + m.dueDate} className="flex justify-between gap-3">
              <span>
                {m.label} · {pct(m.percentBps)} · due {day(m.dueDate)}
              </span>
              <span className="font-medium">{inr(m.amountPaise)}</span>
            </li>
          ))}
        </ul>
        {q.inclusions.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold">Inclusions</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-fg-muted">
              {q.inclusions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </>
        )}
        {q.notes && <p className="mt-4 text-sm whitespace-pre-line text-fg-muted">{q.notes}</p>}
      </Card>
    </div>
  );
}
