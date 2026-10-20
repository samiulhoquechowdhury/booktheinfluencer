'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowLeftIcon, ArrowRightIcon, ExternalLink, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EVENT_TYPES } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { DatePicker } from '@repo/ui/date-picker';
import { Select } from '@repo/ui/select';
import { Skeleton } from '@repo/ui/skeleton';
import { TabPanel, Tabs } from '@repo/ui/tabs';
import { EVENT_TYPE_LABELS, todayIST } from '@repo/utils';
import { api } from '@/lib/api/client';
import { day, pct } from '@/lib/format';
import { mediaSrc, webUrl } from '@/lib/media';
import { EDIT_CATALOGUE, can } from '@/lib/roles';
import type { AdminMedia, AdminTalent, BlackoutRow, RateCard, Rep } from '@/lib/types';
import { Card, ErrorNote, PageHeader } from '../ui';
import { useUser } from '../user-context';
import { ProfileForm, errorText } from './profile-form';
import { STATUS_LABEL, STATUS_TONE } from './talent-list';

const input = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary-text';

export function TalentDetail({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['talent', id], queryFn: () => api.get<AdminTalent>(`/admin/talents/${id}`) });
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-96 rounded-2xl" />;
  return <Loaded t={q.data} />;
}

function Loaded({ t }: { t: AdminTalent }) {
  const user = useUser();
  const qc = useQueryClient();
  const editable = can(user, ...EDIT_CATALOGUE);
  const router = useRouter();
  const pathname = usePathname();
  const tab = useSearchParams().get('tab') ?? 'profile';
  const setTab = (v: string) => router.replace(v === 'profile' ? pathname : `${pathname}?tab=${v}`, { scroll: false });
  const setTalent = (next: AdminTalent) => {
    qc.setQueryData(['talent', t.id], next);
    void qc.invalidateQueries({ queryKey: ['talents'] });
  };
  const status = useMutation({
    mutationFn: (s: AdminTalent['status']) => api.put<AdminTalent>(`/admin/talents/${t.id}/status`, { status: s }),
    onSuccess: (next) => (setTalent(next), toast.success(next.status === 'PUBLISHED' ? 'Profile is live' : next.status === 'HIDDEN' ? 'Profile hidden' : 'Back to draft')),
    onError: (e) => toast.error(errorText(e)),
  });

  return (
    <>
      <Link href="/talents" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Talents
      </Link>
      <PageHeader
        title={t.stageName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
            <span className="font-mono">{t.slug}</span>
            {t.featured && <Star className="size-3.5 fill-gold text-gold" aria-label="Featured" />}
            {t.hasLogin && <span className="text-xs">· has a portal login</span>}
            {t.status === 'PUBLISHED' && (
              <a href={webUrl(`/t/${t.slug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-text hover:underline">
                View on site <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </span>
        }
        actions={
          editable && (
            <>
              {t.status !== 'PUBLISHED' && (
                <Button size="sm" disabled={status.isPending} onClick={() => status.mutate('PUBLISHED')}>
                  {status.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : 'Publish'}
                </Button>
              )}
              {t.status === 'PUBLISHED' && (
                <Button size="sm" variant="outline" disabled={status.isPending} onClick={() => status.mutate('HIDDEN')}>
                  Hide from site
                </Button>
              )}
              {t.status !== 'DRAFT' && (
                <Button size="sm" variant="ghost" disabled={status.isPending} onClick={() => status.mutate('DRAFT')}>
                  Move to draft
                </Button>
              )}
            </>
          )
        }
      />
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'profile', label: 'Profile' },
          { value: 'photos', label: 'Photos', count: t.media.length },
          { value: 'rates', label: 'Rate cards', count: t.counts.rateCards },
          { value: 'reps', label: 'Representatives', count: t.reps.length },
          { value: 'blackouts', label: 'Blackouts', count: t.counts.blackouts },
        ]}
      >
        <div className="mt-6">
          <TabPanel value="profile">
            <ProfileForm talent={t} onSaved={setTalent} />
          </TabPanel>
          <TabPanel value="photos">
            <Photos t={t} editable={editable} />
          </TabPanel>
          <TabPanel value="rates">
            <RateCards talentId={t.id} editable={editable} />
          </TabPanel>
          <TabPanel value="reps">
            <Reps t={t} editable={editable} />
          </TabPanel>
          <TabPanel value="blackouts">
            <Blackouts talentId={t.id} editable={editable} />
          </TabPanel>
        </div>
      </Tabs>
    </>
  );
}

/** ADM-2: 4–6 photos for a live profile; the first is the cover. Uploads arrive with the storage vendor. */
function Photos({ t, editable }: { t: AdminTalent; editable: boolean }) {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ['talent', t.id] });
  const order = useMutation({ mutationFn: (ids: string[]) => api.put(`/admin/talents/${t.id}/media/order`, { ids }), onSuccess: refresh, onError: (e) => toast.error(errorText(e)) });
  const remove = useMutation({ mutationFn: (m: AdminMedia) => api.del(`/admin/talents/${t.id}/media/${m.id}`), onSuccess: () => (refresh(), toast.success('Photo removed')), onError: (e) => toast.error(errorText(e)) });
  const [form, setForm] = useState({ key: '', alt: '', credit: '', width: '', height: '' });
  const add = useMutation({
    mutationFn: () =>
      api.post(`/admin/talents/${t.id}/media`, {
        key: form.key.trim(),
        alt: form.alt.trim(),
        ...(form.credit.trim() ? { credit: form.credit.trim() } : {}),
        ...(Number(form.width) ? { width: Number(form.width) } : {}),
        ...(Number(form.height) ? { height: Number(form.height) } : {}),
      }),
    onSuccess: () => (refresh(), setForm({ key: '', alt: '', credit: '', width: '', height: '' }), toast.success('Photo added')),
    onError: (e) => toast.error(errorText(e)),
  });
  const media = [...t.media].sort((a, b) => a.sortOrder - b.sortOrder);
  const move = (i: number, by: number) => {
    const ids = media.map((m) => m.id);
    const [x] = ids.splice(i, 1);
    ids.splice(i + by, 0, x!);
    order.mutate(ids);
  };

  return (
    <div className="grid gap-6">
      {media.length < 4 && <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">A live profile needs 4–6 photos ({media.length} now).</p>}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {media.map((m, i) => (
          <li key={m.id} className="overflow-hidden rounded-2xl border border-border bg-bg-elevated">
            <div className="relative aspect-[4/5] bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview from the website origin */}
              <img src={mediaSrc(m.key)} alt={m.alt} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} className="size-full object-cover" />
              {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">Cover</span>}
            </div>
            <div className="grid gap-1 p-3 text-xs">
              <p className="line-clamp-2 text-fg-muted">{m.alt}</p>
              {m.credit && <p className="text-fg-subtle">© {m.credit}</p>}
              {editable && (
                <div className="mt-1 flex items-center gap-1">
                  <button type="button" aria-label="Move earlier" disabled={i === 0 || order.isPending} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30">
                    <ArrowLeftIcon className="size-4" />
                  </button>
                  <button type="button" aria-label="Move later" disabled={i === media.length - 1 || order.isPending} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30">
                    <ArrowRightIcon className="size-4" />
                  </button>
                  <button type="button" aria-label="Remove photo" disabled={remove.isPending} onClick={() => remove.mutate(m)} className="ml-auto grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {editable && media.length < 6 && (
        <Card>
          <h2 className="font-semibold">Add a photo</h2>
          <p className="mt-1 text-xs text-fg-muted">Direct uploads arrive with the storage provider. For now, register a photo already on the website (e.g. /talent/name-1.jpg) or a licensed image URL.</p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <input required aria-label="Photo path or URL" placeholder="Photo path or URL" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className={input} />
            <input required minLength={3} aria-label="Alt text" placeholder="Describe the photo (alt text)" value={form.alt} onChange={(e) => setForm({ ...form, alt: e.target.value })} className={input} />
            <input aria-label="Credit" placeholder="Photo credit (if the licence needs one)" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} className={input} />
            <div className="grid grid-cols-2 gap-3">
              <input aria-label="Width (px)" placeholder="Width px" inputMode="numeric" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value.replace(/\D/g, '') })} className={input} />
              <input aria-label="Height (px)" placeholder="Height px" inputMode="numeric" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value.replace(/\D/g, '') })} className={input} />
            </div>
            <Button type="submit" size="sm" disabled={add.isPending} className="justify-self-start">
              <Plus aria-hidden /> Add photo
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

const emptyCard = { eventType: '', minimum: '', selling: '', commission: '15', notes: '' };

/** T-143: INTERNAL rates. Never shown to customers or talent. */
function RateCards({ talentId, editable }: { talentId: string; editable: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['rate-cards', talentId], queryFn: () => api.get<RateCard[]>(`/admin/talents/${talentId}/rate-cards`) });
  const [edit, setEdit] = useState<{ id?: string; v: typeof emptyCard } | null>(null);
  const refresh = () => (void qc.invalidateQueries({ queryKey: ['rate-cards', talentId] }), void qc.invalidateQueries({ queryKey: ['talent', talentId] }));
  const save = useMutation({
    mutationFn: () => {
      const body = { eventType: edit!.v.eventType || null, minimumRupees: Number(edit!.v.minimum) || 0, sellingRupees: Number(edit!.v.selling) || 0, commissionBps: Math.round(Number(edit!.v.commission) * 100) || 0, notes: edit!.v.notes.trim() || null };
      return edit!.id ? api.put(`/admin/talents/${talentId}/rate-cards/${edit!.id}`, body) : api.post(`/admin/talents/${talentId}/rate-cards`, body);
    },
    onSuccess: () => (refresh(), setEdit(null), toast.success('Rate card saved')),
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/admin/talents/${talentId}/rate-cards/${id}`), onSuccess: () => (refresh(), toast.success('Rate card removed')), onError: (e) => toast.error(errorText(e)) });
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-40 rounded-2xl" />;
  const label = (e: string | null) => (e ? EVENT_TYPE_LABELS[e as keyof typeof EVENT_TYPE_LABELS] ?? e : 'General (any event)');

  return (
    <div className="grid gap-4">
      <p className="text-sm text-fg-muted">Internal only. The quote builder uses the card for the lead’s event type, else the general one; a fee below the minimum needs super-admin approval.</p>
      {q.data.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="tnum w-full min-w-[40rem] text-sm">
            <thead className="bg-surface text-left text-xs text-fg-muted">
              <tr>
                {['Event type', 'Minimum', 'Selling', 'Commission', 'Notes', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {q.data.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{label(r.eventType)}</td>
                  <td className="px-4 py-3">₹{r.minimumRupees.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">₹{r.sellingRupees.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">{pct(r.commissionBps)}</td>
                  <td className="px-4 py-3 text-fg-muted">{r.notes ?? ''}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {editable && (
                      <>
                        <button type="button" className="mr-3 text-primary-text hover:underline" onClick={() => setEdit({ id: r.id, v: { eventType: r.eventType ?? '', minimum: String(r.minimumRupees), selling: String(r.sellingRupees), commission: String(r.commissionBps / 100), notes: r.notes ?? '' } })}>
                          Edit
                        </button>
                        <button type="button" className="text-danger hover:underline" disabled={remove.isPending} onClick={() => remove.mutate(r.id)}>
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!q.data.length && <p className="text-sm text-fg-muted">No rate cards yet.</p>}
      {editable &&
        (edit ? (
          <Card>
            <form
              className="grid gap-3 sm:grid-cols-[14rem_1fr_1fr_8rem]"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <Select aria-label="Event type" value={edit.v.eventType} onValueChange={(v) => setEdit({ ...edit, v: { ...edit.v, eventType: v } })} emptyLabel="General (any event)" options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] }))} />
              <input required aria-label="Minimum ₹" placeholder="Minimum ₹" inputMode="numeric" value={edit.v.minimum} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, minimum: e.target.value.replace(/\D/g, '') } })} className={`${input} tnum`} />
              <input required aria-label="Selling ₹" placeholder="Selling ₹" inputMode="numeric" value={edit.v.selling} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, selling: e.target.value.replace(/\D/g, '') } })} className={`${input} tnum`} />
              <input required aria-label="Commission %" placeholder="Commission %" inputMode="decimal" value={edit.v.commission} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, commission: e.target.value } })} className={`${input} tnum`} />
              <input aria-label="Notes" placeholder="Notes (internal)" value={edit.v.notes} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, notes: e.target.value } })} className={`${input} sm:col-span-3`} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={save.isPending}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEdit(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button size="sm" variant="outline" className="justify-self-start" onClick={() => setEdit({ v: emptyCard })}>
            <Plus aria-hidden /> Add rate card
          </Button>
        ))}
    </div>
  );
}

const VERIFY_TONE = { PENDING: 'bg-warning/15 text-warning', VERIFIED: 'bg-success/15 text-success', REJECTED: 'bg-danger/10 text-danger' } as const;

/** T-144: who represents this talent; "Verified" on the website needs a verified rep (CAT-11). */
function Reps({ t, editable }: { t: AdminTalent; editable: boolean }) {
  const qc = useQueryClient();
  const all = useQuery({ queryKey: ['reps'], queryFn: () => api.get<Rep[]>('/admin/reps') });
  const refresh = () => (void qc.invalidateQueries({ queryKey: ['talent', t.id] }), void qc.invalidateQueries({ queryKey: ['reps'] }));
  const link = useMutation({ mutationFn: ({ repId, on }: { repId: string; on: boolean }) => (on ? api.put(`/admin/talents/${t.id}/reps/${repId}`) : api.del(`/admin/talents/${t.id}/reps/${repId}`)), onSuccess: refresh, onError: (e) => toast.error(errorText(e)) });
  const verify = useMutation({ mutationFn: ({ repId, status }: { repId: string; status: string }) => api.put(`/admin/reps/${repId}/verification`, { status }), onSuccess: () => (refresh(), toast.success('Verification updated')), onError: (e) => toast.error(errorText(e)) });
  const [pick, setPick] = useState('');
  const [nw, setNw] = useState<{ name: string; agencyName: string; phone: string; email: string } | null>(null);
  const create = useMutation({
    mutationFn: async () => {
      const r = await api.post<{ id: string }>('/admin/reps', { name: nw!.name, agencyName: nw!.agencyName || null, phone: nw!.phone, email: nw!.email || null });
      await api.put(`/admin/talents/${t.id}/reps/${r.id}`);
    },
    onSuccess: () => (refresh(), setNw(null), toast.success('Representative added')),
    onError: (e) => toast.error(errorText(e)),
  });
  const linked = (all.data ?? []).filter((r) => t.reps.some((x) => x.id === r.id));
  const others = (all.data ?? []).filter((r) => !t.reps.some((x) => x.id === r.id));

  return (
    <div className="grid gap-4">
      {!t.reps.length && <p className="text-sm text-fg-muted">No representative linked yet.</p>}
      <ul className="grid gap-3">
        {(linked.length ? linked : t.reps.map((r) => ({ ...r, phone: '', email: null, hasLogin: false, talents: [] }))).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {r.name}
                {r.agencyName ? <span className="font-normal text-fg-muted"> · {r.agencyName}</span> : null}
              </p>
              <p className="text-sm text-fg-muted">
                {[r.phone, r.email].filter(Boolean).join(' · ')}
                {r.hasLogin ? ' · has a portal login' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {editable ? (
                <Select className="w-40" aria-label={`Verification for ${r.name}`} value={r.verification} onValueChange={(v) => v !== r.verification && verify.mutate({ repId: r.id, status: v })} options={[{ value: 'PENDING', label: 'Pending' }, { value: 'VERIFIED', label: 'Verified' }, { value: 'REJECTED', label: 'Rejected' }]} />
              ) : (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERIFY_TONE[r.verification]}`}>{r.verification.toLowerCase()}</span>
              )}
              {editable && (
                <Button size="sm" variant="ghost" disabled={link.isPending} onClick={() => link.mutate({ repId: r.id, on: false })}>
                  Unlink
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {editable && (
        <Card className="grid gap-3">
          <h2 className="font-semibold">Add a representative</h2>
          <div className="flex flex-wrap gap-2">
            <Select className="w-full sm:w-80" aria-label="Existing representative" value={pick} onValueChange={setPick} placeholder="Choose an existing representative" options={others.map((r) => ({ value: r.id, label: r.agencyName ? `${r.name} · ${r.agencyName}` : r.name }))} />
            <Button size="sm" variant="outline" disabled={!pick || link.isPending} onClick={() => link.mutate({ repId: pick, on: true }, { onSuccess: () => setPick('') })}>
              Link
            </Button>
            {!nw && (
              <Button size="sm" variant="ghost" onClick={() => setNw({ name: '', agencyName: '', phone: '', email: '' })}>
                <Plus aria-hidden /> New representative
              </Button>
            )}
          </div>
          {nw && (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <input required aria-label="Name" placeholder="Name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} className={input} />
              <input aria-label="Agency" placeholder="Agency (optional)" value={nw.agencyName} onChange={(e) => setNw({ ...nw, agencyName: e.target.value })} className={input} />
              <input required aria-label="Mobile" placeholder="Mobile (10 digits)" inputMode="tel" value={nw.phone} onChange={(e) => setNw({ ...nw, phone: e.target.value })} className={input} />
              <input aria-label="Email" placeholder="Email (optional)" type="email" value={nw.email} onChange={(e) => setNw({ ...nw, email: e.target.value })} className={input} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={create.isPending}>
                  Add and link
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setNw(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}

/** AVL-4 / T-145: dates the talent is unavailable. The website hides them for those dates (CAT-4). */
function Blackouts({ talentId, editable }: { talentId: string; editable: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['blackouts', talentId], queryFn: () => api.get<BlackoutRow[]>(`/admin/talents/${talentId}/blackouts`) });
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const refresh = () => (void qc.invalidateQueries({ queryKey: ['blackouts', talentId] }), void qc.invalidateQueries({ queryKey: ['talent', talentId] }));
  const add = useMutation({ mutationFn: () => api.post(`/admin/talents/${talentId}/blackouts`, { date, note: note.trim() || null }), onSuccess: () => (refresh(), setDate(''), setNote(''), toast.success('Blackout added')), onError: (e) => toast.error(errorText(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/admin/talents/${talentId}/blackouts/${id}`), onSuccess: refresh, onError: (e) => toast.error(errorText(e)) });
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-40 rounded-2xl" />;
  const upcoming = q.data.filter((b) => b.date >= todayIST());

  return (
    <div className="grid gap-4">
      {!upcoming.length && <p className="text-sm text-fg-muted">No upcoming blackout dates.</p>}
      <ul className="grid gap-2">
        {upcoming.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{day(b.date)}</span>
              {b.note && <span className="text-fg-muted"> · {b.note}</span>}
            </span>
            {editable && (
              <button type="button" aria-label={`Remove ${day(b.date)}`} disabled={remove.isPending} onClick={() => remove.mutate(b.id)} className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-danger">
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) add.mutate();
          }}
        >
          <DatePicker className="w-full sm:w-56" aria-label="Date" value={date} min={todayIST()} onChange={setDate} />
          <input aria-label="Note" placeholder="Note (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={`${input} sm:w-72`} />
          <Button type="submit" size="sm" disabled={!date || add.isPending}>
            <Plus aria-hidden /> Add date
          </Button>
        </form>
      )}
    </div>
  );
}
