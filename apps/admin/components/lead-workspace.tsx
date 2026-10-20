'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Phone, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AVAILABILITY_STATUSES, type AvailabilityStatus, type LeadStage } from '@repo/schemas';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { Button } from '@repo/ui/button';
import { Select } from '@repo/ui/select';
import { Skeleton } from '@repo/ui/skeleton';
import { AVAILABILITY_LABELS, EVENT_TYPE_LABELS } from '@repo/utils';
import { api } from '@/lib/api/client';
import { day, rupeesRange, titleCase, when } from '@/lib/format';
import { SEND_CONTRACT, SET_AVAILABILITY, STAGE_NAMES, WORK_LEADS, can } from '@/lib/roles';
import type { Activity, ContractRow, Workspace, WorkspaceBooking } from '@/lib/types';
import { errMsg, useLeadMutation } from '@/lib/hooks/use-lead-mutation';
import { AddTalent, OpsChecklist, RemoveBooking, StartTime, canChangeShortlist } from './lead-extras';
import { Card, ErrorNote, Field, PageHeader } from './ui';
import { useUser } from './user-context';

const NEEDS_REASON: LeadStage[] = ['LOST', 'CANCELLED'];

/** PIPE-3..6, AVL-1..4: one lead, its bookings and the activity log. */
export function LeadWorkspace({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['lead', id], queryFn: () => api.get<Workspace>(`/admin/leads/${id}`) });
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data)
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  return <Loaded w={q.data} />;
}

function Loaded({ w }: { w: Workspace }) {
  const user = useUser();
  const canWork = can(user, ...WORK_LEADS);
  const b = w.brief;

  return (
    <>
      <Link href="/leads" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Pipeline
      </Link>
      <PageHeader
        title={b.companyName ?? w.customer.name ?? 'Lead'}
        description={
          <>
            <span className="font-mono">{w.ref}</span> · {STAGE_NAMES[w.stage]}
            {w.lostReason && <> · {w.lostReason}</>}
          </>
        }
        actions={canWork && <OwnerControl w={w} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid min-w-0 content-start gap-6">
          {canWork && w.nextStages.length > 0 && <StageControl w={w} />}
          <Card>
            <h2 className="font-semibold">Brief</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Event">{EVENT_TYPE_LABELS[b.eventType as keyof typeof EVENT_TYPE_LABELS] ?? titleCase(b.eventType)}</Field>
              <Field label="Date">
                {day(b.eventDate)}
                {b.altDate ? ` (alt ${day(b.altDate)})` : ''}
              </Field>
              <Field label="Start time">
                <StartTime w={w} editable={canWork} />
              </Field>
              <Field label="City / venue">
                {titleCase(b.city)}
                {b.venue ? ` · ${b.venue}` : ''}
              </Field>
              <Field label="Audience">{b.audienceSize ?? '—'}</Field>
              <Field label="Duration">{b.durationMins ? `${b.durationMins} min` : '—'}</Field>
              <Field label="Budget">{rupeesRange(b.budget)}</Field>
              <Field label="Language">{b.language ?? 'No preference'}</Field>
              <Field label="GSTIN">{b.gstin ?? '—'}</Field>
              <Field label="Source">{b.source ?? '—'}</Field>
            </dl>
            {b.notes && <p className="mt-4 rounded-xl bg-surface p-3 text-sm whitespace-pre-line">{b.notes}</p>}
          </Card>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Talent</h2>
              {canWork && canChangeShortlist(w) && <AddTalent w={w} />}
            </div>
            {w.bookings.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">No talent on this lead yet.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {w.bookings.map((bk) => (
                  <BookingRow key={bk.id} leadId={w.id} b={bk} canEditShortlist={canWork && canChangeShortlist(w)} />
                ))}
              </ul>
            )}
          </Card>
        </div>
        <aside className="grid content-start gap-6">
          <Card>
            <h2 className="font-semibold">Customer</h2>
            <p className="mt-3 font-medium">{w.customer.name ?? '—'}</p>
            {w.customer.phone && (
              <a href={`tel:${w.customer.phone}`} className="mt-2 flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
                <Phone className="size-4" aria-hidden /> {w.customer.phone}
              </a>
            )}
            {w.customer.email && (
              <a href={`mailto:${w.customer.email}`} className="mt-1 flex items-center gap-2 text-sm break-all text-fg-muted hover:text-fg">
                <Mail className="size-4 shrink-0" aria-hidden /> {w.customer.email}
              </a>
            )}
          </Card>
          <Card>
            <h2 className="font-semibold">Activity</h2>
            {canWork && <NoteForm leadId={w.id} />}
            <ActivityLog items={w.activity} />
          </Card>
        </aside>
      </div>
    </>
  );
}

function OwnerControl({ w }: { w: Workspace }) {
  const user = useUser();
  const assign = useLeadMutation(w.id, (ownerId: string | null) => api.patch<Workspace>(`/admin/leads/${w.id}/owner`, { ownerId }), 'Owner updated');
  if (!can(user, 'SALES')) return <span className="text-sm text-fg-muted">Owner: {w.owner?.name ?? 'Unassigned'}</span>;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-fg-muted">Owner: {w.owner?.name ?? 'Unassigned'}</span>
      {w.owner?.id !== user.id && (
        <Button size="sm" variant="outline" disabled={assign.isPending} onClick={() => assign.mutate(user.id)}>
          Assign to me
        </Button>
      )}
    </div>
  );
}

function StageControl({ w }: { w: Workspace }) {
  const [to, setTo] = useState<LeadStage | ''>('');
  const [text, setText] = useState('');
  const [policyRef, setPolicyRef] = useState('');
  const move = useLeadMutation(
    w.id,
    () =>
      api.post<Workspace>(`/admin/leads/${w.id}/transition`, {
        to,
        ...(NEEDS_REASON.includes(to as LeadStage) ? { reason: text } : to === 'SETTLEMENT' ? { completionNote: text } : text ? { note: text } : {}),
        ...(to === 'CANCELLED' && policyRef ? { policyRef } : {}),
      }),
    'Stage updated',
  );
  const prompt = to && NEEDS_REASON.includes(to) ? 'Reason (required)' : to === 'SETTLEMENT' ? 'Completion note (required)' : 'Note (optional)';
  return (
    <Card className="grid gap-3">
      <h2 className="font-semibold">Move stage</h2>
      <p className="text-xs text-fg-muted">Only the moves the booking rules allow are listed. Confirmation happens automatically once every condition is met.</p>
      <form
        className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          if (to) move.mutate(undefined, { onSuccess: () => (setTo(''), setText(''), setPolicyRef('')) });
        }}
      >
        <Select aria-label="Next stage" value={to} onValueChange={(v) => setTo(v as LeadStage)} placeholder="Choose a stage" options={w.nextStages.map((s) => ({ value: s, label: STAGE_NAMES[s] }))} />
        <div className="grid gap-2">
          <textarea aria-label={prompt} placeholder={prompt} value={text} onChange={(e) => setText(e.target.value)} rows={2} className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary-text" />
          {to === 'CANCELLED' && <input aria-label="Cancellation clause" placeholder="Cancellation clause, e.g. Contract §7.2" value={policyRef} onChange={(e) => setPolicyRef(e.target.value)} className="h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary-text" />}
        </div>
        <Button type="submit" disabled={!to || move.isPending} variant={to && NEEDS_REASON.includes(to) ? 'outline' : 'primary'}>
          {move.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : 'Move'}
        </Button>
      </form>
    </Card>
  );
}

function BookingRow({ leadId, b, canEditShortlist }: { leadId: string; b: WorkspaceBooking; canEditShortlist: boolean }) {
  const user = useUser();
  const canSet = can(user, ...SET_AVAILABILITY) && b.availability !== 'CONFIRMED' && !b.cancelledAt;
  const setAvail = useLeadMutation(leadId, (status: AvailabilityStatus) => api.put<Workspace>(`/admin/bookings/${b.id}/availability`, { status }), 'Availability updated');
  const accept = useLeadMutation(leadId, () => api.post<Workspace>(`/admin/bookings/${b.id}/rep-acceptance`, {}), 'Representative acceptance recorded');
  const options = AVAILABILITY_STATUSES.filter((s) => s !== 'CONFIRMED').map((s) => ({ value: s, label: AVAILABILITY_LABELS[s].label }));

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{b.talent.name}</p>
          <p className="font-mono text-xs text-fg-subtle">{b.ref}</p>
        </div>
        <span className="flex items-center gap-2">
          <AvailabilityPill status={b.availability} />
          {canEditShortlist && <RemoveBooking leadId={leadId} b={b} />}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
        <span className="rounded-full bg-surface-2 px-2 py-1">Quotes: {b.quoteStatuses.length ? b.quoteStatuses.map(titleCase).join(', ') : 'none'}</span>
        <span className="rounded-full bg-surface-2 px-2 py-1">Rep: {b.repAcceptedAt ? `accepted ${when(b.repAcceptedAt)}` : 'not yet'}</span>
        {b.confirmedAt && (
          <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-medium text-success">
            <CheckCircle2 className="size-3.5" aria-hidden /> Confirmed {when(b.confirmedAt)}
          </span>
        )}
        {b.cancelledAt && <span className="rounded-full bg-danger/10 px-2 py-1 font-medium text-danger">Cancelled</span>}
        {can(user, 'OPS', 'SALES', 'TALENT_MANAGER') && !b.cancelledAt && (b.availability === 'CONFIRMED' || b.quoteStatuses.includes('ACCEPTED')) && <OpsChecklist leadId={leadId} b={b} />}
        <Link href={`/bookings/${b.id}/quotes`} className="ml-auto font-medium text-primary-text hover:underline">
          Quotes →
        </Link>
      </div>
      {b.quoteStatuses.includes('ACCEPTED') && <ContractAndPayments leadId={leadId} b={b} />}
      {canSet && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select className="w-full sm:w-72" aria-label={`Availability for ${b.talent.name}`} value={b.availability} onValueChange={(v) => v !== b.availability && setAvail.mutate(v as AvailabilityStatus)} options={options} disabled={setAvail.isPending} />
          {!b.repAcceptedAt && (b.availability === 'AVAILABLE' || b.availability === 'TENTATIVE') && (
            <Button size="sm" variant="outline" disabled={accept.isPending} onClick={() => accept.mutate(undefined)}>
              <UserRoundCheck aria-hidden /> Record rep acceptance
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

const CONTRACT_LABEL: Record<ContractRow['status'], string> = { DRAFT: 'Draft', SENT: 'Out for signature', PARTIALLY_SIGNED: 'Partly signed', SIGNED: 'Signed', VOID: 'Void' };

/** CON-2: after the quote is accepted, send the contract for e-signature; payments link to the collections list. */
function ContractAndPayments({ leadId, b }: { leadId: string; b: WorkspaceBooking }) {
  const user = useUser();
  const qc = useQueryClient();
  const [withRep, setWithRep] = useState(false);
  const contracts = useQuery({ queryKey: ['contracts', b.id], queryFn: () => api.get<ContractRow[]>(`/admin/bookings/${b.id}/contracts`) });
  const live = contracts.data?.find((c) => c.status !== 'VOID');
  const send = useMutation({
    mutationFn: () => api.post<ContractRow[]>(`/admin/bookings/${b.id}/contract`, { includeRep: withRep }),
    onSuccess: (rows) => {
      qc.setQueryData(['contracts', b.id], rows);
      void qc.invalidateQueries({ queryKey: ['lead', leadId] });
      toast.success('Contract sent for e-signature');
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface px-3 py-2 text-sm">
      <span className="text-fg-muted">
        Contract: <span className="font-medium text-fg">{contracts.isLoading ? '…' : live ? CONTRACT_LABEL[live.status] : 'Not sent'}</span>
        {live?.signedAt ? ` · ${when(live.signedAt)}` : live?.sentAt ? ` · sent ${when(live.sentAt)}` : ''}
      </span>
      {!live && contracts.data && can(user, ...SEND_CONTRACT) && !b.cancelledAt && (
        <span className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            <input type="checkbox" checked={withRep} onChange={(e) => setWithRep(e.target.checked)} className="size-3.5 accent-[var(--primary)]" /> Rep signs too
          </label>
          <Button size="sm" variant="outline" disabled={send.isPending} onClick={() => send.mutate()}>
            Send for e-signature
          </Button>
        </span>
      )}
      <Link href={`/payments?view=all&bookingId=${b.id}`} className="ml-auto font-medium text-primary-text hover:underline">
        Payments →
      </Link>
    </div>
  );
}

function NoteForm({ leadId }: { leadId: string }) {
  const [text, setText] = useState('');
  const add = useLeadMutation(leadId, () => api.post(`/admin/leads/${leadId}/notes`, { text }), 'Note added');
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length >= 3) add.mutate(undefined, { onSuccess: () => setText('') });
      }}
    >
      <textarea aria-label="Internal note" placeholder="Add an internal note…" value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-text" />
      <Button type="submit" size="sm" variant="secondary" disabled={text.trim().length < 3 || add.isPending} className="justify-self-end">
        Add note
      </Button>
    </form>
  );
}

const TYPE_LABEL: Record<string, string> = {
  brief_received: 'Brief received',
  assigned: 'Owner',
  stage_change: 'Stage',
  note: 'Note',
  talent_added: 'Talent added',
  talent_removed: 'Talent removed',
  quote_drafted: 'Quote drafted',
  quote_approval_requested: 'Quote needs approval',
  quote_returned: 'Quote returned',
  contract_void: 'Contract void',
  payment_partial: 'Part payment',
  payment_duplicate: 'Extra payment',
  payment_failed: 'Payment failed',
  availability: 'Availability',
  rep_accepted: 'Rep accepted',
  confirmed: 'Confirmed',
  quote_sent: 'Quote sent',
  quote_accepted: 'Quote accepted',
  quote_changes_requested: 'Changes requested',
  contract_sent: 'Contract',
  contract_signed: 'Contract signed',
  payment_received: 'Payment',
  refund_review: 'Refund review',
  payout_created: 'Payout',
  payout_paid: 'Payout paid',
};

function ActivityLog({ items }: { items: Activity[] }) {
  if (!items.length) return <p className="mt-4 text-sm text-fg-muted">Nothing yet.</p>;
  return (
    <ol className="mt-4 grid gap-3">
      {items.map((a) => {
        const meta = a.meta as { from?: string; to?: string } | null;
        return (
          <li key={a.id} className="border-l-2 border-border pl-3 text-sm">
            <p className="text-xs text-fg-subtle">
              {when(a.at)} · {a.actor ?? 'System'}
            </p>
            <p className="font-medium">
              {TYPE_LABEL[a.type] ?? titleCase(a.type)}
              {a.type === 'stage_change' && meta?.to ? `: ${STAGE_NAMES[meta.to as LeadStage] ?? meta.to}` : ''}
              {a.type === 'availability' && meta?.to ? `: ${AVAILABILITY_LABELS[meta.to as AvailabilityStatus]?.label ?? meta.to}` : ''}
            </p>
            {a.body && <p className="text-fg-muted whitespace-pre-line">{a.body}</p>}
          </li>
        );
      })}
    </ol>
  );
}
