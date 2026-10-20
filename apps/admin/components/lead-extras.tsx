'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ClipboardList, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { IndianMobileSchema } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { Select } from '@repo/ui/select';
import { api, type Page } from '@/lib/api/client';
import { titleCase } from '@/lib/format';
import { useLeadMutation } from '@/lib/hooks/use-lead-mutation';
import type { AdminTalent, Workspace, WorkspaceBooking } from '@/lib/types';
import { Dialog, fieldCls } from './dialog';

/** Stages where the shortlist can still change (API: LEAD_LOCKED after these). */
const OPEN_STAGES = new Set(['NEW', 'CONTACTED', 'REQUIREMENT_RECEIVED', 'SHORTLISTED', 'AVAILABILITY_CHECK', 'QUOTE_SENT', 'NEGOTIATION', 'ADVANCE_PENDING']);
export const canChangeShortlist = (w: Workspace) => OPEN_STAGES.has(w.stage);

/** Shortlist: add a live talent to the lead (one booking per talent). */
export function AddTalent({ w }: { w: Workspace }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const results = useQuery({
    queryKey: ['talents', 'pick', q],
    queryFn: () => api.get<Page<AdminTalent>>('/admin/talents', { status: 'PUBLISHED', q: q.trim() || undefined, pageSize: 10 }),
    enabled: open,
  });
  const add = useLeadMutation(w.id, (slug: string) => api.post<Workspace>(`/admin/leads/${w.id}/bookings`, { talentSlug: slug }), 'Talent added to the shortlist');
  const already = new Set(w.bookings.map((b) => b.talent.slug));
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> Add talent
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add talent" description="Live profiles only. Availability starts as “not checked”.">
        <label className="relative block">
          <span className="sr-only">Search talent</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className={`${fieldCls} pl-9`} />
        </label>
        <ul className="mt-3 grid max-h-80 gap-1 overflow-y-auto">
          {results.isLoading && <li className="px-2 py-3 text-sm text-fg-muted">Searching…</li>}
          {results.data?.items.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{t.stageName}</span>
                <span className="block truncate text-xs text-fg-muted">
                  {t.categories.map(titleCase).join(', ')} · {titleCase(t.baseCity)}
                </span>
              </span>
              {already.has(t.slug) ? (
                <span className="text-xs text-fg-subtle">On this lead</span>
              ) : (
                <Button size="sm" variant="secondary" disabled={add.isPending} onClick={() => add.mutate(t.slug)}>
                  Add
                </Button>
              )}
            </li>
          ))}
          {results.data && !results.data.items.length && <li className="px-2 py-3 text-sm text-fg-muted">No live talent matches.</li>}
        </ul>
      </Dialog>
    </>
  );
}

/** Remove a talent that hasn't progressed (no quote, not confirmed); the API refuses otherwise. */
export function RemoveBooking({ leadId, b }: { leadId: string; b: WorkspaceBooking }) {
  const [confirming, setConfirming] = useState(false);
  const remove = useLeadMutation(leadId, () => api.del<Workspace>(`/admin/leads/${leadId}/bookings/${b.id}`), `${b.talent.name} removed`);
  if (b.quoteStatuses.length || b.confirmedAt || b.cancelledAt) return null;
  return confirming ? (
    <span className="flex items-center gap-2 text-xs">
      Remove {b.talent.name}?
      <Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate(undefined)}>
        Remove
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  ) : (
    <button type="button" aria-label={`Remove ${b.talent.name}`} onClick={() => setConfirming(true)} className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-danger">
      <Trash2 className="size-4" />
    </button>
  );
}

/** The start time agreed with the customer (the brief form doesn't ask for it). */
export function StartTime({ w, editable }: { w: Workspace; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(w.brief.startTime ?? '');
  const save = useLeadMutation(w.id, (startTime: string | null) => api.patch<Workspace>(`/admin/leads/${w.id}/brief`, { startTime }), 'Start time saved');
  if (!editing)
    return (
      <span className="inline-flex items-center gap-1.5">
        {w.brief.startTime ?? <span className="text-fg-subtle">time not set</span>}
        {editable && (
          <button type="button" aria-label="Edit start time" onClick={() => setEditing(true)} className="grid size-6 place-items-center rounded text-fg-muted hover:bg-surface-2 hover:text-fg">
            <Pencil className="size-3.5" />
          </button>
        )}
      </span>
    );
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(value || null, { onSuccess: () => setEditing(false) });
      }}
    >
      <input type="time" aria-label="Start time" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 rounded-md border border-border bg-surface px-2 text-sm" />
      <Button type="submit" size="sm" disabled={save.isPending}>
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </form>
  );
}

type ItemStatus = 'NOT_NEEDED' | 'PENDING' | 'ARRANGED';
type Item = { status: ItemStatus; details: string | null };
type Checklist = { travel: Item; hotel: Item; groundTransport: Item; rider: Item; reportingTime: string | null; pointOfContact: { name: string; phone: string } | null; notes: string | null };
const ITEMS = [
  ['travel', 'Travel'],
  ['hotel', 'Hotel'],
  ['groundTransport', 'Ground transport'],
  ['rider', 'Rider'],
] as const;
const blank: Item = { status: 'PENDING', details: null };

/** One-line state of the checklist for the booking card. */
export function opsSummary(raw: unknown) {
  const c = raw as Partial<Checklist> | null;
  if (!c) return 'Not started';
  const arranged = ITEMS.filter(([k]) => c[k]?.status !== 'PENDING').length;
  return `${arranged}/${ITEMS.length} sorted${c.reportingTime ? ` · reporting ${c.reportingTime}` : ''}`;
}

/** OPS-3: travel, hotel, transport, rider, reporting time and on-site contact. Reporting time and contact show in the talent portal. */
export function OpsChecklist({ leadId, b }: { leadId: string; b: WorkspaceBooking }) {
  const [open, setOpen] = useState(false);
  const init = (b.opsChecklist as Partial<Checklist> | null) ?? {};
  const [c, setC] = useState<Checklist>({
    travel: init.travel ?? blank,
    hotel: init.hotel ?? blank,
    groundTransport: init.groundTransport ?? blank,
    rider: init.rider ?? blank,
    reportingTime: init.reportingTime ?? null,
    pointOfContact: init.pointOfContact ?? null,
    notes: init.notes ?? null,
  });
  const contactPhone = c.pointOfContact?.phone ?? '';
  const phoneOk = !c.pointOfContact || IndianMobileSchema.safeParse(contactPhone).success;
  const save = useLeadMutation(
    leadId,
    () =>
      api.put<Workspace>(`/admin/bookings/${b.id}/ops`, {
        ...c,
        pointOfContact: c.pointOfContact && c.pointOfContact.name.trim() ? { name: c.pointOfContact.name.trim(), phone: contactPhone } : null,
        notes: c.notes?.trim() || null,
      }),
    'Ops checklist saved',
  );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 font-medium text-primary-text hover:underline">
        <ClipboardList className="size-3.5" aria-hidden /> Ops: {opsSummary(b.opsChecklist)}
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Ops checklist" description={`${b.talent.name} · ${b.ref}`}>
        <form
          className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneOk) save.mutate(undefined, { onSuccess: () => setOpen(false) });
          }}
        >
          {ITEMS.map(([k, label]) => (
            <fieldset key={k} className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">{label}</legend>
              <Select aria-label={`${label} status`} value={c[k].status} onValueChange={(v) => setC({ ...c, [k]: { ...c[k], status: v as ItemStatus } })} options={[{ value: 'PENDING', label: 'To arrange' }, { value: 'ARRANGED', label: 'Arranged' }, { value: 'NOT_NEEDED', label: 'Not needed' }]} />
              {c[k].status !== 'NOT_NEEDED' && <input aria-label={`${label} details`} placeholder="Details (flight, PNR, hotel, driver…)" value={c[k].details ?? ''} onChange={(e) => setC({ ...c, [k]: { ...c[k], details: e.target.value || null } })} className={fieldCls} />}
            </fieldset>
          ))}
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Reporting time at the venue</span>
            <input type="time" value={c.reportingTime ?? ''} onChange={(e) => setC({ ...c, reportingTime: e.target.value || null })} className={fieldCls} />
          </label>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">On-site contact (shown to the talent)</legend>
            <input aria-label="Contact name" placeholder="Name" value={c.pointOfContact?.name ?? ''} onChange={(e) => setC({ ...c, pointOfContact: e.target.value || contactPhone ? { name: e.target.value, phone: contactPhone } : null })} className={fieldCls} />
            <input aria-label="Contact mobile" placeholder="Mobile (10 digits)" inputMode="tel" value={contactPhone} onChange={(e) => setC({ ...c, pointOfContact: e.target.value || c.pointOfContact?.name ? { name: c.pointOfContact?.name ?? '', phone: e.target.value } : null })} className={fieldCls} />
            {!phoneOk && <span className="text-xs text-danger">Enter a valid 10-digit mobile number.</span>}
          </fieldset>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Notes</span>
            <textarea rows={3} value={c.notes ?? ''} onChange={(e) => setC({ ...c, notes: e.target.value })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-text" />
          </label>
          <Button type="submit" disabled={!phoneOk || save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : 'Save checklist'}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
