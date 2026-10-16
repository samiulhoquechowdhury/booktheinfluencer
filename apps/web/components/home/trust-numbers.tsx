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
    { icon: BadgeCheck, title: 'Verified representation', body: 'Every rep’s authority is checked by our team.' },
    { icon: FileText, title: 'GST-ready paperwork', body: 'Itemised quotes, proforma and contracts.' },
    { icon: Lock, title: 'Secure payments', body: 'UPI, cards and net banking via the gateway.' },
    { icon: UserRound, title: 'Dedicated manager', body: 'One human from brief to final bow.' },
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

      <Reveal stagger className="shell mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {trust.map((t) => (
          <RevealItem key={t.title}>
            <t.icon className="size-6 text-gold" aria-hidden />
            <h3 className="mt-4 font-semibold">{t.title}</h3>
            <p className="mt-1 text-sm text-fg-muted">{t.body}</p>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}
