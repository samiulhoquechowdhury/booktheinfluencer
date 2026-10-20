'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CITY_SLUGS, EVENT_TYPES, LANGUAGES, REPRESENTATION_TYPES } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { Select } from '@repo/ui/select';
import { EVENT_TYPE_LABELS, REPRESENTATION_LABELS } from '@repo/utils';
import { api, ApiError } from '@/lib/api/client';
import { titleCase } from '@/lib/format';
import { EDIT_CATALOGUE, can } from '@/lib/roles';
import type { AdminTalent } from '@/lib/types';
import { Card, PageHeader } from '../ui';
import { useUser } from '../user-context';
import { useCategories } from './talent-list';

type Form = {
  stageName: string;
  slug: string;
  tagline: string;
  bio: string;
  categories: string[];
  baseCity: string;
  travelsTo: string[];
  travelsPanIndia: boolean;
  languages: string[];
  eventTypes: string[];
  tags: string;
  tier: 'STANDARD' | 'PREMIUM';
  representationType: string;
  featured: boolean;
  blackoutSelfEdit: boolean;
  onRequest: boolean;
  feeMin: string;
  feeMax: string;
  showreelUrl: string;
  riderSummary: string;
  pastEvents: { title: string; city: string; year: string }[];
  faqs: { q: string; a: string }[];
  followers: { platform: 'instagram' | 'youtube'; count: string }[];
};

const fromTalent = (t?: AdminTalent): Form => ({
  stageName: t?.stageName ?? '',
  slug: t?.slug ?? '',
  tagline: t?.tagline ?? '',
  bio: t?.bio ?? '',
  categories: t?.categories ?? [],
  baseCity: t?.baseCity ?? 'guwahati',
  travelsTo: t?.travelsTo ?? [],
  travelsPanIndia: t?.travelsPanIndia ?? false,
  languages: t?.languages ?? [],
  eventTypes: t?.eventTypes ?? [],
  tags: (t?.tags ?? []).join(', '),
  tier: t?.tier ?? 'STANDARD',
  representationType: t?.representationType ?? 'PLATFORM_COORDINATED',
  featured: t?.featured ?? false,
  blackoutSelfEdit: t?.blackoutSelfEdit ?? false,
  onRequest: !t?.feeBand,
  feeMin: t?.feeBand ? String(t.feeBand.minRupees) : '',
  feeMax: t?.feeBand ? String(t.feeBand.maxRupees) : '',
  showreelUrl: t?.showreelUrl ?? '',
  riderSummary: t?.riderSummary ?? '',
  pastEvents: (t?.pastEvents ?? []).map((e) => ({ title: e.title, city: e.city, year: String(e.year) })),
  faqs: t?.faqs ?? [],
  followers: (t?.followers ?? []).map((f) => ({ platform: f.platform, count: String(f.count) })),
});

const toBody = (f: Form, create: boolean) => ({
  ...(create ? (f.slug.trim() ? { slug: f.slug.trim() } : {}) : { slug: f.slug.trim() }),
  stageName: f.stageName,
  tagline: f.tagline,
  bio: f.bio,
  categories: f.categories,
  baseCity: f.baseCity,
  travelsTo: f.travelsTo,
  travelsPanIndia: f.travelsPanIndia,
  languages: f.languages,
  eventTypes: f.eventTypes,
  tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean),
  tier: f.tier,
  representationType: f.representationType,
  featured: f.featured,
  blackoutSelfEdit: f.blackoutSelfEdit,
  feeBand: f.onRequest ? null : { minRupees: Number(f.feeMin) || 0, maxRupees: Number(f.feeMax) || 0 },
  showreelUrl: f.showreelUrl.trim() || null,
  riderSummary: f.riderSummary.trim() || null,
  pastEvents: f.pastEvents.map((e) => ({ title: e.title, city: e.city, year: Number(e.year) || 0 })),
  faqs: f.faqs,
  followers: f.followers.map((x) => ({ platform: x.platform, count: Number(x.count) || 0 })),
});

/** API validation errors come back with the failing paths; show them next to the message. */
export function errorText(e: unknown) {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  const issues = Array.isArray(e.details) ? (e.details as { path?: (string | number)[]; message?: string }[]) : [];
  return issues.length ? `${e.message} ${issues.slice(0, 3).map((i) => `${(i.path ?? []).join('.')}: ${i.message}`).join(' · ')}` : e.message;
}

const input = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary-text disabled:opacity-60';
const area = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-text disabled:opacity-60';

function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs text-fg-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
    </label>
  );
}

/** Multi-select as toggle chips. `ordered` numbers the picks (the first category is the primary one). */
function Chips({ label, options, value, onChange, max, ordered }: { label: string; options: readonly { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; max?: number; ordered?: boolean }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-xs text-fg-muted">
        {label}
        {max ? ` (up to ${max})` : ''}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const i = value.indexOf(o.value);
          const on = i >= 0;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={!on && max != null && value.length >= max}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${on ? 'border-primary-text bg-primary-text/10 text-fg' : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'}`}
            >
              {ordered && on ? `${i + 1}. ` : ''}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProfileForm({ talent, onSaved }: { talent?: AdminTalent; onSaved?: (t: AdminTalent) => void }) {
  const user = useUser();
  const editable = can(user, ...EDIT_CATALOGUE);
  const cats = useCategories();
  const [f, setF] = useState<Form>(() => fromTalent(talent));
  const [dirty, setDirty] = useState(false);
  const set = (patch: Partial<Form>) => (setF((x) => ({ ...x, ...patch })), setDirty(true));

  const save = useMutation({
    mutationFn: () => (talent ? api.patch<AdminTalent>(`/admin/talents/${talent.id}`, toBody(f, false)) : api.post<AdminTalent>('/admin/talents', toBody(f, true))),
    onSuccess: (t) => {
      setDirty(false);
      setF(fromTalent(t));
      toast.success(talent ? 'Profile saved' : 'Draft profile created');
      onSaved?.(t);
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const cityOptions = CITY_SLUGS.map((c) => ({ value: c, label: titleCase(c) }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <fieldset disabled={!editable || save.isPending} className="grid gap-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Stage name">
            <input required value={f.stageName} onChange={(e) => set({ stageName: e.target.value })} className={input} />
          </Labeled>
          <Labeled label="Profile URL slug" hint={talent ? 'Changing it breaks old links.' : 'Leave empty to make one from the name.'}>
            <input value={f.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} placeholder="e.g. papon" className={`${input} font-mono`} />
          </Labeled>
          <div className="sm:col-span-2">
            <Labeled label="Tagline (one line, shown on cards)">
              <input value={f.tagline} maxLength={140} onChange={(e) => set({ tagline: e.target.value })} className={input} />
            </Labeled>
          </div>
          <div className="sm:col-span-2">
            <Labeled label="Bio">
              <textarea rows={6} value={f.bio} maxLength={4000} onChange={(e) => set({ bio: e.target.value })} className={area} />
            </Labeled>
          </div>
        </Card>

        <Card className="grid gap-5">
          <Chips label="Categories — the first is the primary one" ordered max={4} options={(cats.data ?? []).map((c) => ({ value: c.slug, label: c.name }))} value={f.categories} onChange={(v) => set({ categories: v })} />
          <Chips label="Event types" options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] }))} value={f.eventTypes} onChange={(v) => set({ eventTypes: v })} max={12} />
          <Chips label="Languages" options={LANGUAGES.map((l) => ({ value: l, label: l }))} value={f.languages} onChange={(v) => set({ languages: v })} max={12} />
          <Labeled label="Tags (comma separated, help search)">
            <input value={f.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="bihu, folk, live band" className={input} />
          </Labeled>
        </Card>

        <Card className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Labeled label="Base city">
              <Select aria-label="Base city" value={f.baseCity} onValueChange={(v) => set({ baseCity: v })} options={cityOptions} disabled={!editable} />
            </Labeled>
            <Labeled label="Tier">
              <Select aria-label="Tier" value={f.tier} onValueChange={(v) => set({ tier: v as Form['tier'] })} options={[{ value: 'STANDARD', label: 'Standard' }, { value: 'PREMIUM', label: 'Premium' }]} disabled={!editable} />
            </Labeled>
            <Labeled label="Representation">
              <Select aria-label="Representation" value={f.representationType} onValueChange={(v) => set({ representationType: v })} options={REPRESENTATION_TYPES.map((r) => ({ value: r, label: REPRESENTATION_LABELS[r] }))} disabled={!editable} />
            </Labeled>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.travelsPanIndia} onChange={(e) => set({ travelsPanIndia: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Travels anywhere in India
          </label>
          {!f.travelsPanIndia && <Chips label="Also travels to" options={cityOptions.filter((c) => c.value !== f.baseCity)} value={f.travelsTo} onChange={(v) => set({ travelsTo: v })} max={20} />}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.featured} onChange={(e) => set({ featured: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Featured on the website
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.blackoutSelfEdit} onChange={(e) => set({ blackoutSelfEdit: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Talent can edit their own blackout dates
            </label>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="font-semibold">Public fee band</h2>
          <p className="-mt-2 text-xs text-fg-muted">Customers only ever see a range, never one exact fee. Internal rates live in rate cards.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.onRequest} onChange={(e) => set({ onRequest: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Show “On request” instead of a range
          </label>
          {!f.onRequest && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled label="From (₹)">
                <input inputMode="numeric" value={f.feeMin} onChange={(e) => set({ feeMin: e.target.value.replace(/\D/g, '') })} className={`${input} tnum`} />
              </Labeled>
              <Labeled label="To (₹)">
                <input inputMode="numeric" value={f.feeMax} onChange={(e) => set({ feeMax: e.target.value.replace(/\D/g, '') })} className={`${input} tnum`} />
              </Labeled>
            </div>
          )}
        </Card>

        <Card className="grid gap-4">
          <Labeled label="Showreel URL (YouTube or Vimeo)">
            <input type="url" value={f.showreelUrl} onChange={(e) => set({ showreelUrl: e.target.value })} className={input} />
          </Labeled>
          <Labeled label="Rider summary (shown to customers)">
            <textarea rows={3} value={f.riderSummary} maxLength={1000} onChange={(e) => set({ riderSummary: e.target.value })} className={area} />
          </Labeled>
        </Card>

        <Card className="grid gap-3">
          <h2 className="font-semibold">Past events</h2>
          {f.pastEvents.map((e, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_12rem_6rem_2.5rem]">
              <input aria-label="Event" placeholder="Event" value={e.title} onChange={(x) => set({ pastEvents: f.pastEvents.map((y, j) => (j === i ? { ...y, title: x.target.value } : y)) })} className={input} />
              <input aria-label="City" placeholder="City" value={e.city} onChange={(x) => set({ pastEvents: f.pastEvents.map((y, j) => (j === i ? { ...y, city: x.target.value } : y)) })} className={input} />
              <input aria-label="Year" placeholder="Year" inputMode="numeric" value={e.year} onChange={(x) => set({ pastEvents: f.pastEvents.map((y, j) => (j === i ? { ...y, year: x.target.value.replace(/\D/g, '') } : y)) })} className={`${input} tnum`} />
              <RemoveButton onClick={() => set({ pastEvents: f.pastEvents.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <AddButton onClick={() => set({ pastEvents: [...f.pastEvents, { title: '', city: '', year: String(new Date().getFullYear()) }] })}>Add event</AddButton>
        </Card>

        <Card className="grid gap-3">
          <h2 className="font-semibold">FAQs</h2>
          {f.faqs.map((x, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2.5rem]">
              <div className="grid gap-2">
                <input aria-label="Question" placeholder="Question" value={x.q} onChange={(e) => set({ faqs: f.faqs.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)) })} className={input} />
                <textarea aria-label="Answer" placeholder="Answer" rows={2} value={x.a} onChange={(e) => set({ faqs: f.faqs.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)) })} className={area} />
              </div>
              <RemoveButton onClick={() => set({ faqs: f.faqs.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <AddButton onClick={() => set({ faqs: [...f.faqs, { q: '', a: '' }] })}>Add FAQ</AddButton>
        </Card>

        <Card className="grid gap-3">
          <h2 className="font-semibold">Followers</h2>
          <p className="-mt-1 text-xs text-fg-muted">Only figures you can source; they’re shown publicly.</p>
          {f.followers.map((x, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[12rem_1fr_2.5rem]">
              <Select aria-label="Platform" value={x.platform} onValueChange={(v) => set({ followers: f.followers.map((y, j) => (j === i ? { ...y, platform: v as 'instagram' | 'youtube' } : y)) })} options={[{ value: 'instagram', label: 'Instagram' }, { value: 'youtube', label: 'YouTube' }]} disabled={!editable} />
              <input aria-label="Followers" inputMode="numeric" value={x.count} onChange={(e) => set({ followers: f.followers.map((y, j) => (j === i ? { ...y, count: e.target.value.replace(/\D/g, '') } : y)) })} className={`${input} tnum`} />
              <RemoveButton onClick={() => set({ followers: f.followers.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {f.followers.length < 4 && <AddButton onClick={() => set({ followers: [...f.followers, { platform: 'instagram', count: '' }] })}>Add platform</AddButton>}
        </Card>

        {editable && (
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t border-border bg-bg/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {dirty && talent && <span className="text-sm text-fg-muted">Unsaved changes</span>}
            <Button type="submit" disabled={save.isPending || (Boolean(talent) && !dirty)}>
              {save.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : talent ? 'Save profile' : 'Create draft'}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" aria-label="Remove" onClick={onClick} className="grid size-10 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-danger">
    <Trash2 className="size-4" />
  </button>
);
const AddButton = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <Button type="button" size="sm" variant="ghost" className="justify-self-start" onClick={onClick}>
    <Plus aria-hidden /> {children}
  </Button>
);

/** ADM-5: new profiles always start as drafts; photos, rate cards and reps come after. */
export function NewTalent() {
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <>
      <Link href="/talents" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Talents
      </Link>
      <PageHeader title="New talent" description="Saved as a draft. Add photos, rate cards and representatives next, then publish." />
      <ProfileForm
        onSaved={(t) => {
          void qc.invalidateQueries({ queryKey: ['talents'] });
          router.push(`/talents/${t.id}`);
        }}
      />
    </>
  );
}
