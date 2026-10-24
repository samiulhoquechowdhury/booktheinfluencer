'use client';

import Image from 'next/image';
import { useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Circle, Clock, FileText, ImagePlus, Loader2, MessageSquareWarning, Mic2, Send, Star, Trash2, UserRound, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_SLUGS, EVENT_TYPES, LANGUAGES, ONBOARDING_MAX_PHOTOS, ONBOARDING_MIN_PHOTOS, OnboardingProfileSchema, type Onboarding, type OnboardingProfileInput } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { Input, Textarea } from '@repo/ui/field';
import { Select } from '@repo/ui/select';
import { cn } from '@repo/ui/lib/cn';
import { EVENT_TYPE_LABELS, formatDate } from '@repo/utils';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/client';
import { useOnboardingAction, useSession } from '@/lib/api/hooks';
import { CATEGORIES, CITIES, cityName } from '@/lib/reference';
import { DashboardShell, DashHeader, HelpCard } from '@/components/dashboard/dashboard-shell';

type Step = 'basics' | 'about' | 'performances' | 'fees' | 'photos' | 'review';
const STEPS: { key: Step; label: string; icon: typeof UserRound }[] = [
  { key: 'basics', label: 'Basics', icon: UserRound },
  { key: 'about', label: 'About you', icon: FileText },
  { key: 'performances', label: 'Performances', icon: Mic2 },
  { key: 'fees', label: 'Fees and links', icon: Wallet },
  { key: 'photos', label: 'Photos', icon: Camera },
  { key: 'review', label: 'Review and submit', icon: Send },
];

const EMPTY: OnboardingProfileInput = { stageName: '', categories: [], tagline: '', bio: '', baseCity: 'guwahati', travelsPanIndia: true, travelsTo: [], languages: [], eventTypes: [], feeBand: null, showreelUrl: null, riderSummary: null };
const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
const toggle = <T,>(list: readonly T[], v: T, max = 99): T[] => (list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? [...list] : [...list, v]);

/** Resize in the browser to at most 1600 px on the long side and re-encode as JPEG (keeps uploads small). */
async function toJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height };
}

/**
 * Talent self-onboarding: a step-by-step profile form. Each "Save and continue" stores the draft;
 * photos upload straight away; the last step submits it for staff review. Approved profiles go live
 * on the website and this screen gives way to the talent portal.
 */
export function OnboardingView({ data }: { data: Onboarding }) {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>(data.profile ? (data.status === 'DRAFT' ? 'basics' : 'review') : 'basics');
  const [form, setForm] = useState<OnboardingProfileInput>(data.profile ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feeOnRequest, setFeeOnRequest] = useState(!data.profile?.feeBand);
  const save = useOnboardingAction((p: OnboardingProfileInput) => api.portal.onboarding.save(p));
  const submit = useOnboardingAction(() => api.portal.onboarding.submit());
  const set = (patch: Partial<OnboardingProfileInput>) => setForm((f) => ({ ...f, ...patch }));

  const idx = STEPS.findIndex((s) => s.key === step);
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const done: Record<Step, boolean> = {
    basics: Boolean(data.profile),
    about: (data.profile?.bio.length ?? 0) >= 80 && Boolean(data.profile?.tagline),
    performances: Boolean(data.profile?.eventTypes.length && data.profile.languages.length),
    fees: Boolean(data.profile),
    photos: data.photos.length >= ONBOARDING_MIN_PHOTOS,
    review: data.status === 'IN_REVIEW',
  };

  /** Validate the whole form (drafts allow empty optional parts) and save it, then move on. */
  const saveAndNext = () => {
    const input = { ...form, feeBand: feeOnRequest ? null : form.feeBand };
    const parsed = OnboardingProfileSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])));
      toast.error('Check the highlighted fields');
      return;
    }
    setErrors({});
    save.mutate(input, {
      onSuccess: () => {
        toast.success(data.status === 'IN_REVIEW' ? 'Saved. Submit again when you’re ready.' : 'Saved');
        go(STEPS[idx + 1]!.key);
      },
      onError: (e) => toast.error(errText(e)),
    });
  };

  const locked = data.status === 'IN_REVIEW';

  return (
    <DashboardShell
      name={form.stageName || session?.name || 'New talent'}
      caption="Talent application"
      nav={STEPS.map((s, i) => ({
        key: s.key,
        label: s.label,
        icon: done[s.key] ? CheckCircle2 : s.icon,
        active: step === s.key,
        // Steps after Basics need a saved draft first.
        onSelect: () => (i === 0 || data.profile ? go(s.key) : toast('Save your basic details first')),
      }))}
      footer={<HelpCard title="How this works" body="Fill in your profile and add photos, then submit. Our team reviews it, usually within 2 working days. Check back here for the result." action={null} />}
    >
      <div className="pb-24">
        <StatusBanner data={data} />

        {step === 'basics' && (
          <StepCard title="The basics" description="How you appear on the website. You can change these until you submit.">
            <Input label="Stage name" value={form.stageName} onChange={(e) => set({ stageName: e.target.value })} error={errors.stageName} hint="The name audiences know you by." maxLength={80} />
            <Field label="What do you do?" hint="Pick up to 3. The first is your main category." error={errors.categories}>
              <Chips options={CATEGORY_SLUGS.map((c) => ({ value: c, label: CATEGORIES.find((x) => x.slug === c)?.singular ?? c }))} selected={form.categories ?? []} onToggle={(v) => set({ categories: toggle(form.categories ?? [], v, 3) })} numbered />
            </Field>
            <Field label="Where are you based?">
              <Select aria-label="Base city" value={form.baseCity} onValueChange={(v) => set({ baseCity: v as OnboardingProfileInput['baseCity'] })} options={CITIES.map((c) => ({ value: c.slug, label: c.name, description: c.state }))} />
            </Field>
            <Input label="One-line introduction" value={form.tagline ?? ''} onChange={(e) => set({ tagline: e.target.value })} error={errors.tagline} hint={`${(form.tagline ?? '').length}/120 · e.g. “Assamese folk and Bollywood live singer”`} maxLength={120} />
          </StepCard>
        )}

        {step === 'about' && (
          <StepCard title="About you" description="Event planners read this to decide. Write in your own words.">
            <Textarea label="Your bio" rows={8} value={form.bio ?? ''} onChange={(e) => set({ bio: e.target.value })} error={errors.bio} maxLength={2000} hint={`${(form.bio ?? '').length}/2000 · at least 80 characters. Mention your style, experience and the kinds of shows you do.`} />
          </StepCard>
        )}

        {step === 'performances' && (
          <StepCard title="Performances" description="Where and how you perform. This decides which searches you appear in.">
            <Field label="Events you perform at" error={errors.eventTypes}>
              <Chips options={EVENT_TYPES.map((e) => ({ value: e, label: EVENT_TYPE_LABELS[e] }))} selected={form.eventTypes ?? []} onToggle={(v) => set({ eventTypes: toggle(form.eventTypes ?? [], v) })} />
            </Field>
            <Field label="Languages you perform in" error={errors.languages}>
              <Chips options={LANGUAGES.map((l) => ({ value: l, label: l }))} selected={form.languages ?? []} onToggle={(v) => set({ languages: toggle(form.languages ?? [], v, 10) })} />
            </Field>
            <Field label="Travel">
              <Chips options={[{ value: 'yes', label: 'Anywhere in India' }, { value: 'no', label: 'Selected cities only' }]} selected={[form.travelsPanIndia ? 'yes' : 'no']} onToggle={(v) => set({ travelsPanIndia: v === 'yes' })} />
              {!form.travelsPanIndia && (
                <div className="mt-3">
                  <Chips options={CITIES.filter((c) => c.slug !== form.baseCity).map((c) => ({ value: c.slug, label: c.name }))} selected={form.travelsTo ?? []} onToggle={(v) => set({ travelsTo: toggle(form.travelsTo ?? [], v) })} />
                </div>
              )}
            </Field>
          </StepCard>
        )}

        {step === 'fees' && (
          <StepCard title="Fees and links" description="Optional. Shown to customers as an indicative range; the final fee is always agreed per event.">
            <Field label="Fee per show">
              <Chips options={[{ value: 'req', label: 'Show “On request”' }, { value: 'band', label: 'Show a range' }]} selected={[feeOnRequest ? 'req' : 'band']} onToggle={(v) => setFeeOnRequest(v === 'req')} />
              {!feeOnRequest && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input label="From (₹)" inputMode="numeric" value={form.feeBand?.minRupees ?? ''} onChange={(e) => set({ feeBand: { minRupees: Number(e.target.value.replace(/\D/g, '')) || 0, maxRupees: form.feeBand?.maxRupees ?? 0 } })} error={errors['feeBand.minRupees']} />
                  <Input label="Up to (₹)" inputMode="numeric" value={form.feeBand?.maxRupees ?? ''} onChange={(e) => set({ feeBand: { minRupees: form.feeBand?.minRupees ?? 0, maxRupees: Number(e.target.value.replace(/\D/g, '')) || 0 } })} error={errors['feeBand.maxRupees']} />
                </div>
              )}
            </Field>
            <Input label="Showreel link (YouTube or Instagram)" type="url" value={form.showreelUrl ?? ''} onChange={(e) => set({ showreelUrl: e.target.value.trim() || null })} error={errors.showreelUrl} hint="A recent live performance works best." />
            <Textarea label="Technical rider (optional)" rows={3} value={form.riderSummary ?? ''} onChange={(e) => set({ riderSummary: e.target.value || null })} maxLength={500} hint="Sound, stage and travel needs in a few lines." />
          </StepCard>
        )}

        {step === 'photos' && <Photos data={data} />}

        {step === 'review' && (
          <StepCard title="Review and submit" description="Check everything, then send it to our team for review.">
            <dl className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
              <Summary label="Stage name" value={data.profile?.stageName} onEdit={() => go('basics')} />
              <Summary label="Categories" value={data.profile?.categories.map((c) => CATEGORIES.find((x) => x.slug === c)?.singular).join(', ')} onEdit={() => go('basics')} />
              <Summary label="Based in" value={data.profile ? cityName(data.profile.baseCity) : undefined} onEdit={() => go('basics')} />
              <Summary label="Introduction" value={data.profile?.tagline} onEdit={() => go('basics')} />
              <Summary label="Events" value={data.profile?.eventTypes.map((e) => EVENT_TYPE_LABELS[e]).join(', ')} onEdit={() => go('performances')} />
              <Summary label="Languages" value={data.profile?.languages.join(', ')} onEdit={() => go('performances')} />
              <Summary label="Fee" value={data.profile ? (data.profile.feeBand ? `₹${data.profile.feeBand.minRupees.toLocaleString('en-IN')} – ₹${data.profile.feeBand.maxRupees.toLocaleString('en-IN')}` : 'On request') : undefined} onEdit={() => go('fees')} />
              <Summary label="Photos" value={`${data.photos.length} of ${ONBOARDING_MIN_PHOTOS}–${ONBOARDING_MAX_PHOTOS}`} onEdit={() => go('photos')} />
            </dl>
            {data.gaps.length > 0 ? (
              <div className="rounded-2xl border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_6%,transparent)] p-4 text-sm">
                <p className="font-semibold">Still needed before you can submit</p>
                <ul className="mt-2 space-y-1 text-fg-muted">
                  {data.gaps.map((g) => <li key={g} className="flex items-center gap-2"><Circle className="size-3" aria-hidden /> {g}</li>)}
                </ul>
              </div>
            ) : locked ? (
              <p className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"><Clock className="size-4 text-primary-text" aria-hidden /> Submitted on {formatDate(data.submittedAt!)}. The result will show here.</p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" aria-hidden /> Everything’s in place.</p>
            )}
            {!locked && (
              <Button size="lg" disabled={data.gaps.length > 0 || submit.isPending} onClick={() => submit.mutate(undefined, { onSuccess: () => toast.success('Submitted for review'), onError: (e) => toast.error(errText(e)) })}>
                {submit.isPending ? <Loader2 className="animate-spin" aria-label="Submitting" /> : <><Send aria-hidden /> Submit for review</>}
              </Button>
            )}
            <p className="text-xs text-fg-muted">By submitting you confirm the details and photos are yours to use, and agree that bookings are coordinated through BookTheInfluencer.</p>
          </StepCard>
        )}

        {/* Step navigation */}
        {step !== 'review' && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={idx === 0} onClick={() => go(STEPS[idx - 1]!.key)}>
              <ArrowLeft aria-hidden /> Back
            </Button>
            {step === 'photos' ? (
              <Button onClick={() => go('review')}>
                Continue <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button onClick={saveAndNext} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : <>Save and continue <ArrowRight aria-hidden /></>}
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function StatusBanner({ data }: { data: Onboarding }) {
  if (data.status === 'NOT_STARTED' || data.status === 'DRAFT') {
    return <DashHeader eyebrow="Join as talent" title="Create your talent profile" description="Six short steps. Your profile goes live on the website after our team reviews it." />;
  }
  if (data.status === 'IN_REVIEW') {
    return (
      <div className="mb-8">
        <DashHeader eyebrow="Talent application" title="Your profile is being reviewed" description="Our team checks every profile before it goes live, usually within 2 working days. Check back here for the result." />
        <p className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm text-fg-muted">Need to fix something? You can still edit. Saving takes it out of review until you submit again.</p>
      </div>
    );
  }
  return (
    <div className="mb-8">
      <DashHeader eyebrow="Talent application" title="A few changes needed" />
      <div className="mt-4 flex gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_6%,transparent)] p-4 text-sm">
        <MessageSquareWarning className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-semibold">Note from our team</p>
          <p className="mt-1 text-fg-muted">“{data.reviewNote}”</p>
          <p className="mt-2 text-xs text-fg-muted">Make the changes, then submit again from the last step.</p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-3xl border border-border bg-surface p-5 sm:p-8">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-fg-muted">{description}</p>
      <div className="mt-6 grid gap-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function Chips<T extends string>({ options, selected, onToggle, numbered = false }: { options: { value: T; label: string }[]; selected: readonly T[]; onToggle: (v: T) => void; numbered?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        const n = selected.indexOf(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cn('flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors', on ? 'border-transparent bg-fg text-bg' : 'border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg')}
          >
            {numbered && on && <span className="tabular grid size-5 place-items-center rounded-full bg-brand-gradient text-[0.6875rem] font-bold text-primary-fg">{n + 1}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Summary({ label, value, onEdit }: { label: string; value?: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 bg-bg-elevated px-4 py-3">
      <div className="min-w-0">
        <dt className="text-xs text-fg-muted">{label}</dt>
        <dd className={cn('mt-0.5 text-sm font-medium wrap-break-word', !value && 'text-warning')}>{value || 'Not added'}</dd>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-xs font-semibold text-primary-text hover:underline">Edit</button>
    </div>
  );
}

function Photos({ data }: { data: Onboarding }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const add = useOnboardingAction((p: { dataUrl: string; width: number; height: number }) => api.portal.onboarding.addPhoto(p));
  const remove = useOnboardingAction((id: string) => api.portal.onboarding.removePhoto(id));
  const cover = useOnboardingAction((id: string) => api.portal.onboarding.cover(id));
  const room = ONBOARDING_MAX_PHOTOS - data.photos.length;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} isn’t a photo`);
          continue;
        }
        const jpeg = await toJpeg(file);
        if (jpeg.width < 400 || jpeg.height < 400) {
          toast.error(`${file.name} is too small. Use a photo at least 400 px on each side.`);
          continue;
        }
        await add.mutateAsync(jpeg).catch((e: unknown) => toast.error(errText(e)));
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <StepCard title="Photos" description={`Add ${ONBOARDING_MIN_PHOTOS} to ${ONBOARDING_MAX_PHOTOS} photos. Clear, well-lit performance and portrait shots work best. The first one is your cover.`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.photos.map((p, i) => (
          <li key={p.id} className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-surface-2">
            <Image src={p.src} alt="" fill sizes="(min-width: 640px) 240px, 45vw" className="object-cover" unoptimized />
            {i === 0 && <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[0.6875rem] font-semibold text-white"><Star className="size-3 fill-gold text-gold" aria-hidden /> Cover</span>}
            <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5">
              {i > 0 && (
                <button type="button" onClick={() => cover.mutate(p.id, { onError: (e) => toast.error(errText(e)) })} className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black/85">
                  Make cover
                </button>
              )}
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove.mutate(p.id, { onError: (e) => toast.error(errText(e)) })} className="grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-danger">
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {room > 0 && (
          <li>
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="grid aspect-4/5 w-full place-items-center rounded-2xl border border-dashed border-border-strong text-fg-muted transition-colors hover:border-primary-text hover:text-fg disabled:opacity-60">
              <span className="text-center">
                {busy ? <Loader2 className="mx-auto size-6 animate-spin" aria-hidden /> : <ImagePlus className="mx-auto size-6" aria-hidden />}
                <span className="mt-2 block text-sm font-semibold">{busy ? 'Uploading…' : 'Add photos'}</span>
                <span className="block text-xs">{room} more allowed</span>
              </span>
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void upload(e.target.files)} />
      <p className={cn('text-sm', data.photos.length >= ONBOARDING_MIN_PHOTOS ? 'text-success' : 'text-fg-muted')}>
        {data.photos.length >= ONBOARDING_MIN_PHOTOS ? `${data.photos.length} photos added.` : `${data.photos.length} of ${ONBOARDING_MIN_PHOTOS} required photos added.`} Only upload photos you have the right to use.
      </p>
    </StepCard>
  );
}
