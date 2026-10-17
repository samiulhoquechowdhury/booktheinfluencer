'use client';

import { BadgeCheck, FileText, Lock, UserRound } from 'lucide-react';
import { CountUp, Marquee, Reveal, RevealItem } from '@/lib/motion';

const EVENTS = ['Annual Days', 'Weddings', 'Launches', 'College Fests', 'Award Nights', 'Sangeets', 'Conferences', 'Club Nights', 'Brand Campaigns', 'Bihu Utsav', 'Town Halls', 'Private Parties'];

export function TrustNumbers({ talentCount, cityCount }: { talentCount: number; cityCount: number }) {
  const stats = [
    { value: talentCount, suffix: '', label: 'Artists on the roster' },
    { value: cityCount, suffix: '', label: 'Cities across India' },
    { value: 24, suffix: 'h', label: 'Typical first response' },
    { value: 4, suffix: '', label: 'Checks before “Confirmed”' },
  ];
  const trust = [
    { icon: BadgeCheck, title: 'Verified representation', body: 'We check that every manager or agent is authorised to book the artist before anything moves.', tag: 'Authority checked' },
    { icon: FileText, title: 'GST-ready paperwork', body: 'Itemised quotes, a proforma invoice and a proper contract for every booking.', tag: 'Quote · Proforma · Contract' },
    { icon: Lock, title: 'Secure payments', body: 'Pay in milestones by UPI, card or net banking through a secure payment gateway.', tag: 'UPI · Cards · Net banking' },
    { icon: UserRound, title: 'Dedicated manager', body: 'One person handles your booking from the first brief to the final bow.', tag: 'One point of contact' },
  ];
  return (
    <section aria-labelledby="trust-title" className="relative border-y border-border py-24 md:py-32">
      <h2 id="trust-title" className="sr-only">Why book with us</h2>
      <Reveal stagger className="shell grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
        {stats.map((s) => (
          <RevealItem key={s.label} className="border-l border-border pl-5">
            <CountUp value={s.value} suffix={s.suffix} className="block font-display text-[clamp(3.5rem,8vw,7rem)] leading-none font-black tracking-[-0.05em]" />
            <p className="mt-3 text-sm text-fg-muted">{s.label}</p>
          </RevealItem>
        ))}
      </Reveal>

      <Marquee className="mt-20 border-y border-border py-6" speed={60} label="Event types we book for">
        {EVENTS.map((e) => (
          <span key={e} className="flex items-center gap-8 pr-8 font-display text-3xl font-extrabold tracking-tight whitespace-nowrap uppercase md:text-5xl">
            {e}
            <span aria-hidden className="size-3 rounded-full bg-brand-gradient" />
          </span>
        ))}
      </Marquee>

      <div className="shell mt-20 md:mt-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-3">Why book with us</p>
            <p className="font-display text-h1 font-extrabold">
              Booked with <span className="font-serif font-normal italic">confidence.</span>
            </p>
          </div>
          <p className="max-w-sm text-fg-muted">Every booking runs through the same managed process, whoever you book.</p>
        </div>

        <Reveal stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((t) => (
            <RevealItem key={t.title} className="h-full">
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated p-6 transition-[transform,border-color,box-shadow] duration-(--duration-slow) ease-(--ease-out-expo) hover:-translate-y-1 hover:border-border-strong hover:shadow-float">
                {/* Gradient edge that lights up on hover */}
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-0 transition-opacity duration-(--duration-slow) group-hover:opacity-100" />
                <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_70%)] opacity-0 transition-opacity duration-(--duration-slow) group-hover:opacity-100" />
                <span className="relative grid size-12 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary-text ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,transparent)] transition-transform duration-(--duration-slow) group-hover:scale-105">
                  <t.icon className="size-6" aria-hidden />
                </span>
                <h3 className="relative mt-6 text-lg font-semibold">{t.title}</h3>
                <p className="relative mt-2 flex-1 text-sm text-fg-muted">{t.body}</p>
                <p className="relative mt-6 border-t border-border pt-4 text-xs font-medium text-fg-subtle">{t.tag}</p>
              </article>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
