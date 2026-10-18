'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowRight, CalendarDays, Check, Clock, MapPin, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { PublicTalent } from '@repo/schemas';
import { DatePicker } from '@repo/ui/date-picker';
import { Select } from '@repo/ui/select';
import { cn } from '@repo/ui/lib/cn';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { EVENT_TYPE_LABELS, ctaLabelForTier, formatFeeBand } from '@repo/utils';
import { CITIES, categorySingular, cityName } from '@/lib/reference';
import { useMediaQuery, useScrollLock } from '@/lib/motion';
import { QUOTE_INCLUDES, enquireHref } from './booking-card';

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Floating booking dock for talent profiles (all screen sizes). Shows who you're booking and a
 * primary action that opens the booking panel: bottom sheet on phones, centred panel on larger
 * screens. The panel collects date, event type and city, then hands off to the enquiry flow
 * with those prefilled. Hides while scrolling down, returns on scroll up.
 */
export function BookingDock({ talent }: { talent: PublicTalent }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const cta = ctaLabelForTier(talent.tier);
  const cover = talent.images[0]!;
  const fee = formatFeeBand(talent.feeBand).range;

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y > prev + 4 && y > 500) setHidden(true);
    else if (y < prev - 4) setHidden(false);
  });

  return (
    <>
      <motion.div
        className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl sm:bottom-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        initial={reduce ? false : { y: '160%' }}
        animate={{ y: hidden && !open && !reduce ? '160%' : '0%' }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="liquid-glass relative flex items-center gap-3 rounded-full p-2 pl-2">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-bg sm:size-12">
            <Image src={cover.src} alt="" fill sizes="48px" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{talent.name}</span>
            <span className="flex items-center gap-1.5 truncate text-xs text-fg-muted">
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inset-0 rounded-full bg-success motion-safe:animate-ping" />
                <span className="relative size-1.5 rounded-full bg-success" />
              </span>
              <span className="truncate">
                {fee} · reply within 24h
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-full bg-brand-gradient px-4 text-sm font-semibold whitespace-nowrap text-primary-fg shadow-[0_10px_28px_-12px_var(--glow-1)] transition-transform active:scale-[0.97] sm:h-12 sm:px-6"
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">{cta}</span>
            <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
          </button>
        </div>
      </motion.div>

      <BookingPanel talent={talent} open={open} onOpenChange={setOpen} />
    </>
  );
}

function BookingPanel({ talent, open, onOpenChange }: { talent: PublicTalent; open: boolean; onOpenChange: (v: boolean) => void }) {
  const reduce = useReducedMotion();
  const desktop = useMediaQuery('(min-width: 640px)');
  const [date, setDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [city, setCity] = useState<string>(talent.baseCity);
  useScrollLock(open);
  const cover = talent.images[0]!;
  const cta = ctaLabelForTier(talent.tier);
  const href = enquireHref(talent, date || undefined, { eventType: eventType || undefined, city: city || undefined });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                data-lenis-prevent
                className="fixed inset-x-0 bottom-0 z-[96] max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-border bg-bg-elevated shadow-float sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-h-[90dvh] sm:max-w-lg sm:rounded-[1.75rem]"
                // Phones: sheet slides up. Larger screens: centred panel scales in (motion owns the centring transform).
                initial={desktop ? { opacity: 0, scale: reduce ? 1 : 0.96, x: '-50%', y: '-46%' } : reduce ? { opacity: 0 } : { y: '100%' }}
                animate={desktop ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : reduce ? { opacity: 1 } : { y: 0 }}
                exit={desktop ? { opacity: 0, scale: reduce ? 1 : 0.97, x: '-50%', y: '-48%' } : reduce ? { opacity: 0 } : { y: '100%' }}
                transition={{ duration: 0.5, ease: EASE }}
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                {/* Grab handle (phones) */}
                <div aria-hidden className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border-strong sm:hidden" />

                {/* Talent header */}
                <div className="relative flex items-center gap-4 p-5 pb-4 sm:p-7 sm:pb-5">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl">
                    <Image src={cover.src} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-text">
                      <Sparkles className="size-3.5" aria-hidden /> Booking request
                    </p>
                    <Dialog.Title className="mt-0.5 truncate font-display text-2xl font-extrabold tracking-tight">{talent.name}</Dialog.Title>
                    <p className="flex items-center gap-1 truncate text-xs text-fg-muted">
                      {talent.categories.map(categorySingular).join(' · ')}
                      <span aria-hidden>·</span>
                      <MapPin className="size-3" aria-hidden /> {cityName(talent.baseCity)}
                    </p>
                  </div>
                  <Dialog.Close className="grid size-9 shrink-0 place-items-center self-start rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Close">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>

                {/* Quick start */}
                <div className="space-y-4 border-t border-border px-5 py-5 sm:px-7">
                  <div>
                    <label htmlFor="bd-date" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
                      <CalendarDays className="size-3.5" aria-hidden /> Event date
                    </label>
                    <DatePicker id="bd-date" value={date} onChange={setDate} placeholder="When’s the event?" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-fg-muted">Event type</p>
                      <Select
                        aria-label="Event type"
                        value={eventType}
                        onValueChange={setEventType}
                        emptyLabel="Choose an event"
                        options={talent.eventTypes.map((e) => ({ value: e, label: EVENT_TYPE_LABELS[e] }))}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-fg-muted">City</p>
                      <Select aria-label="City" value={city} onValueChange={setCity} options={CITIES.map((c) => ({ value: c.slug, label: c.name, description: c.state }))} />
                    </div>
                  </div>
                </div>

                {/* What happens next */}
                <div className="border-t border-border px-5 py-5 sm:px-7">
                  <p className="text-xs font-semibold text-fg-muted">Your quote will include</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {QUOTE_INCLUDES.map((x) => (
                      <li key={x} className="flex gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        <span className="text-fg-muted">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action */}
                <div className="sticky bottom-0 border-t border-border bg-bg-elevated/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
                  <Link
                    href={href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient font-semibold text-primary-fg shadow-[0_14px_34px_-14px_var(--glow-1)] transition-transform active:scale-[0.98]',
                    )}
                  >
                    {cta}
                    <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
                  </Link>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" aria-hidden /> Free to request
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden /> Reply within 24 hours
                    </span>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
