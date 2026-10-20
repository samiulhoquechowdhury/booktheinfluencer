'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { CitySlugSchema, EVENT_TYPES, EnquirySchema, EventTypeSchema, LANGUAGES, type Enquiry, type EnquiryInput } from '@repo/schemas';
import { EVENT_TYPE_LABELS, todayIST } from '@repo/utils';
import { Button } from '@repo/ui/button';
import { DatePicker } from '@repo/ui/date-picker';
import { CheckboxField, Input, Textarea } from '@repo/ui/field';
import { Select } from '@repo/ui/select';
import { OtpInput } from '@repo/ui/otp-input';
import { ApiError } from '@/lib/api/client';
import { REAL_API } from '@/lib/api/constants';
import { useRequestOtp, useSetSession, useSubmitEnquiry } from '@/lib/api/hooks';
import { CITIES } from '@/lib/reference';
import { Magnetic } from '@/lib/motion';
import { BudgetSlider } from './budget-slider';
import { StepperProgress } from './stepper-progress';
import { TalentPicker } from './talent-picker';

const STEPS = ['Event', 'Talent & budget', 'Contact'] as const;

const STEP_FIELDS: FieldPath<EnquiryInput>[][] = [
  ['event.eventType', 'event.date', 'event.altDate', 'event.city', 'event.venue', 'event.audienceSize', 'event.durationMins'],
  ['talent.talentSlugs', 'talent.budgetMinRupees', 'talent.budgetMaxRupees', 'talent.language', 'talent.notes'],
  ['contact.name', 'contact.phone', 'contact.email', 'contact.company', 'contact.gstin', 'contact.otp', 'contact.consent'],
];

const LABELS: Record<string, string> = {
  'event.eventType': 'Event type', 'event.date': 'Event date', 'event.altDate': 'Alternate date', 'event.city': 'City',
  'event.venue': 'Venue', 'event.audienceSize': 'Audience size', 'event.durationMins': 'Duration',
  'talent.budgetMaxRupees': 'Budget', 'contact.name': 'Name', 'contact.phone': 'Mobile', 'contact.email': 'Email',
  'contact.gstin': 'GSTIN', 'contact.otp': 'Verification code', 'contact.consent': 'Consent',
};

/** Read a nested RHF error message by dotted path. */
function errAt(errors: unknown, path: string): string | undefined {
  const node = path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), errors);
  return node && typeof node === 'object' && 'message' in node ? String((node as { message?: unknown }).message ?? '') || undefined : undefined;
}

/**
 * Enquiry stepper (design.md §6.4): Event → Talent & budget → Contact (+OTP).
 * One form, validated per step; steps slide in the direction of travel.
 */
export function EnquiryStepper() {
  const params = useSearchParams();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [summary, setSummary] = useState<string[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const requestOtp = useRequestOtp();
  const submit = useSubmitEnquiry();
  const setSession = useSetSession();

  const prefillTalent = (params.get('talent') ?? '').split(',').filter(Boolean).slice(0, 5);
  const prefillDate = params.get('date') ?? '';
  const prefillEventType = EventTypeSchema.safeParse(params.get('eventType')).data;
  const prefillCity = CitySlugSchema.safeParse(params.get('city')).data;

  const form = useForm<EnquiryInput, unknown, Enquiry>({
    resolver: zodResolver(EnquirySchema),
    mode: 'onTouched',
    defaultValues: {
      event: { eventType: prefillEventType, date: prefillDate, altDate: '', city: prefillCity, venue: '', audienceSize: undefined, durationMins: 60 },
      talent: { talentSlugs: prefillTalent, budgetMinRupees: 100_000, budgetMaxRupees: 500_000, language: undefined, notes: '' },
      contact: { name: '', phone: '', email: '', company: '', gstin: '', otp: '', consent: undefined },
    },
  });
  const { register, control, formState, trigger, getValues, watch, setValue, handleSubmit } = form;
  const { errors, dirtyFields, touchedFields } = formState;

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const valid = (path: string) => {
    const touched = path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), touchedFields);
    return !!touched && !errAt(errors, path);
  };

  const showSummary = () => {
    const missing = STEP_FIELDS[step]!.filter((f) => errAt(form.formState.errors, f)).map((f) => LABELS[f] ?? f);
    setSummary(missing);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const go = async (to: number) => {
    if (to > step) {
      const ok = await trigger(STEP_FIELDS[step]!, { shouldFocus: true });
      if (!ok) return showSummary();
    }
    setSummary([]);
    setDir(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  const sendOtp = async () => {
    const ok = await trigger(['contact.phone']);
    if (!ok) return;
    requestOtp.mutate(getValues('contact.phone'), {
      onSuccess: (r) => {
        setOtpSent(true);
        setResendIn(r.resendInSeconds);
        toast.success('Code sent', { description: r.devHint });
      },
      onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Couldn’t send the code.'),
    });
  };

  const onSubmit = handleSubmit(
    (data) =>
      submit.mutate(data, {
        onSuccess: (res) => {
          // AUTH-4: account auto-created on OTP verify → sign the guest in as a customer.
          setSession.mutate('CUSTOMER');
          const sp = new URLSearchParams({ ref: res.ref, n: String(res.bookingRefs.length), h: String(res.expectedResponseHours) });
          router.push(`/enquire/success?${sp}`);
        },
        onError: (e) => {
          if (e instanceof ApiError && e.code === 'OTP_INVALID') form.setError('contact.otp', { message: e.message });
          else toast.error(e instanceof ApiError ? e.message : 'Couldn’t submit. Please try again.');
        },
      }),
    () => showSummary(),
  );

  const budget = watch(['talent.budgetMinRupees', 'talent.budgetMaxRupees']) as [number, number];

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { x: d * 64, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { x: d * -64, opacity: 0 }),
  };

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-2xl" aria-label="Event brief">
      <StepperProgress steps={STEPS} current={step} />

      <AnimatePresence>
        {summary.length > 0 && (
          <motion.div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 overflow-hidden rounded-xl border border-danger/40 bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-4 py-3 text-sm outline-none"
          >
            <p className="font-semibold text-danger">A few details need another look:</p>
            <p className="mt-1 text-fg-muted">{summary.join(' · ')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mt-10">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.fieldset
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0 space-y-5"
          >
            <legend className="mb-8 block">
              <span className="eyebrow">Step {step + 1} of 3</span>
              <span className="mt-2 block font-display text-h1 font-extrabold">
                {step === 0 && <>Tell us about the <span className="font-serif font-normal italic">event</span></>}
                {step === 1 && <>Who are you <span className="font-serif font-normal italic">dreaming</span> of?</>}
                {step === 2 && <>Where should we <span className="font-serif font-normal italic">reach</span> you?</>}
              </span>
            </legend>

            {step === 0 && (
              <>
                <Controller
                  control={control}
                  name="event.eventType"
                  render={({ field }) => (
                    <Select variant="field" label="Event type" placeholder="What’s the occasion?" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] }))} error={errAt(errors, 'event.eventType')} valid={valid('event.eventType')} />
                  )}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="event.date"
                    render={({ field }) => (
                      <DatePicker variant="field" label="Event date" min={todayIST()} value={field.value} onChange={(v) => { field.onChange(v); field.onBlur(); }} onBlur={field.onBlur} clearable={false} error={errAt(errors, 'event.date')} valid={valid('event.date')} />
                    )}
                  />
                  <Controller
                    control={control}
                    name="event.altDate"
                    render={({ field }) => (
                      <DatePicker variant="field" label="Alternate date (optional)" placeholder="Optional" min={todayIST()} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errAt(errors, 'event.altDate')} />
                    )}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="event.city"
                    render={({ field }) => (
                      <Select variant="field" label="City" placeholder="Choose a city" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} options={CITIES.map((c) => ({ value: c.slug, label: c.name, description: c.state }))} error={errAt(errors, 'event.city')} valid={valid('event.city')} />
                    )}
                  />
                  <Input label="Venue or area" autoComplete="off" error={errAt(errors, 'event.venue')} valid={valid('event.venue')} {...register('event.venue')} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input type="number" inputMode="numeric" label="Audience size" min={10} error={errAt(errors, 'event.audienceSize')} valid={valid('event.audienceSize')} {...register('event.audienceSize')} />
                  <Controller
                    control={control}
                    name="event.durationMins"
                    render={({ field }) => (
                      <Select
                        variant="field"
                        label="Performance duration"
                        value={field.value == null ? '' : String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        onBlur={field.onBlur}
                        options={[30, 45, 60, 90, 120, 180, 240].map((m) => ({ value: String(m), label: m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? 's' : ''}` }))}
                        error={errAt(errors, 'event.durationMins')}
                      />
                    )}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Controller control={control} name="talent.talentSlugs" render={({ field }) => <TalentPicker value={field.value ?? []} onChange={field.onChange} />} />
                <div className="rounded-xl border border-border bg-surface p-5">
                  <BudgetSlider
                    value={[budget[0] ?? 0, budget[1] ?? 0]}
                    onChange={([a, b]) => {
                      setValue('talent.budgetMinRupees', a, { shouldDirty: true });
                      setValue('talent.budgetMaxRupees', b, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  {errAt(errors, 'talent.budgetMaxRupees') && <p role="alert" className="mt-2 text-xs text-danger">{errAt(errors, 'talent.budgetMaxRupees')}</p>}
                  <p className="mt-3 text-xs text-fg-subtle">Covers the talent fee. Travel, production and GST are itemised separately in your quote.</p>
                </div>
                <Controller
                  control={control}
                  name="talent.language"
                  render={({ field }) => (
                    <Select variant="field" label="Preferred language (optional)" value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)} emptyLabel="No preference" options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
                  )}
                />
                <Textarea label="Anything else? (setlist, theme, dress code…)" error={errAt(errors, 'talent.notes')} {...register('talent.notes')} />
              </>
            )}

            {step === 2 && (
              <>
                <Input label="Your name" autoComplete="name" error={errAt(errors, 'contact.name')} valid={valid('contact.name')} {...register('contact.name')} />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <Input type="tel" inputMode="tel" label="Mobile number" prefix="+91" autoComplete="tel-national" error={errAt(errors, 'contact.phone')} valid={valid('contact.phone')} {...register('contact.phone')} />
                  <Button type="button" variant="outline" size="lg" className="h-[3.625rem] rounded-lg" onClick={sendOtp} disabled={requestOtp.isPending || resendIn > 0}>
                    {requestOtp.isPending ? <Loader2 className="animate-spin" aria-label="Sending" /> : resendIn > 0 ? `Resend in ${resendIn}s` : otpSent ? 'Resend code' : 'Send code'}
                  </Button>
                </div>
                <AnimatePresence>
                  {otpSent && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="rounded-xl border border-border bg-surface p-5">
                        <p className="mb-3 text-sm text-fg-muted">Enter the 6-digit code we sent to your phone.{!REAL_API && <span className="text-fg-subtle"> (Demo: 123456)</span>}</p>
                        <Controller control={control} name="contact.otp" render={({ field, fieldState }) => <OtpInput value={field.value ?? ''} onChange={field.onChange} error={!!fieldState.error} />} />
                        {errAt(errors, 'contact.otp') && <p role="alert" className="mt-2 text-xs font-medium text-danger">{errAt(errors, 'contact.otp')}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Input type="email" label="Email" autoComplete="email" error={errAt(errors, 'contact.email')} valid={valid('contact.email')} {...register('contact.email')} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="Company (optional)" autoComplete="organization" {...register('contact.company')} />
                  <Input label="GSTIN (optional)" autoCapitalize="characters" error={errAt(errors, 'contact.gstin')} valid={!!dirtyFields.contact?.gstin && valid('contact.gstin')} {...register('contact.gstin')} />
                </div>
                <Controller
                  control={control}
                  name="contact.consent"
                  render={({ field, fieldState }) => (
                    <CheckboxField id="consent" checked={field.value === true} onCheckedChange={(v) => field.onChange(v ? true : undefined)} error={fieldState.error?.message}>
                      I agree to be contacted about this brief by phone, WhatsApp and email, and accept the{' '}
                      <Link href="/legal/privacy" className="text-fg underline underline-offset-2">privacy policy</Link>.
                    </CheckboxField>
                  )}
                />
                <p className="flex items-center gap-2 text-xs text-fg-subtle">
                  <ShieldCheck className="size-4" aria-hidden /> Protected against spam (rate limit + verification). Submitting is free and commits you to nothing.
                </p>
              </>
            )}
          </motion.fieldset>
        </AnimatePresence>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => go(step - 1)}>
            <ArrowLeft aria-hidden /> Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Magnetic>
            <Button type="button" size="lg" onClick={() => go(step + 1)}>
              Continue <ArrowRight aria-hidden />
            </Button>
          </Magnetic>
        ) : (
          <Magnetic>
            <Button type="submit" size="lg" disabled={submit.isPending || !otpSent}>
              {submit.isPending ? <><Loader2 className="animate-spin" aria-hidden /> Sending brief</> : <>Send brief <ArrowRight aria-hidden /></>}
            </Button>
          </Magnetic>
        )}
      </div>
    </form>
  );
}
