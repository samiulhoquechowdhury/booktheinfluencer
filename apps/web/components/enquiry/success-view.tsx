'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@repo/ui/button';
import { BRAND } from '@/lib/brand';
import { Reveal, RevealItem } from '@/lib/motion';

const NEXT = [
  { t: 'Within 2 working hours', b: 'A booking manager is assigned and reviews your brief.' },
  { t: 'Availability check', b: 'We confirm your date with each talent’s authorised representative.' },
  { t: 'Within 24 hours', b: 'You receive an itemised quote — fee, travel, production, GST, payment schedule.' },
  { t: 'Contract & advance', b: 'Accept online, e-sign the contract and pay the advance securely.' },
  { t: 'Confirmed', b: 'Only once all four checks pass. Then we coordinate the day.' },
];

export function SuccessView() {
  const sp = useSearchParams();
  const ref = sp.get('ref') ?? '—';
  const n = Number(sp.get('n') ?? 0);
  const hours = Number(sp.get('h') ?? 24);
  const reduce = useReducedMotion();
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (reduce || fired) return;
    setFired(true);
    void import('canvas-confetti').then(({ default: confetti }) =>
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.35 }, colors: ['#8b5cf6', '#d946ef', '#e3b341', '#ffffff'], disableForReducedMotion: true }),
    );
  }, [reduce, fired]);

  return (
    <div className="shell max-w-3xl">
      <div className="text-center">
        <motion.div
          initial={reduce ? false : { scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-brand-gradient text-primary-fg shadow-float"
        >
          <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5 10 17.5 19 7" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25 }} />
          </svg>
        </motion.div>
        <p className="eyebrow mt-8">Brief received</p>
        <h1 className="mt-3 font-display text-display font-black">
          You’re in <span className="font-serif font-normal italic">good hands.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-fg-muted">
          {n > 0 ? `We’re checking availability for ${n} ${n === 1 ? 'talent' : 'talents'}.` : 'We’ll shortlist talent that fits your brief.'} Expect your first update within {hours} hours.
        </p>
        <div className="mx-auto mt-8 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface py-3 pr-3 pl-5">
          <span className="text-sm text-fg-muted">Reference</span>
          <span className="tabular font-display text-2xl font-extrabold tracking-tight">{ref}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(ref).then(() => toast.success('Reference copied'))}
            aria-label="Copy reference number"
            className="grid size-9 place-items-center rounded-lg hover:bg-surface-2"
          >
            <Copy className="size-4" />
          </button>
        </div>
      </div>

      <section aria-labelledby="next-title" className="mt-16">
        <h2 id="next-title" className="eyebrow mb-6">What happens next</h2>
        <Reveal stagger as="ol" className="relative space-y-6 border-l border-border pl-8">
          {NEXT.map((s, i) => (
            <RevealItem as="li" key={s.t} className="relative">
              <span className="tabular absolute -left-[2.6rem] grid size-5 place-items-center rounded-full border border-border-strong bg-bg text-[0.625rem] font-bold">{i + 1}</span>
              <p className="font-semibold">{s.t}</p>
              <p className="text-sm text-fg-muted">{s.b}</p>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href="/account">Track in your dashboard</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(`Hi! My brief reference is ${ref}.`)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden /> WhatsApp your manager
          </a>
        </Button>
      </div>
    </div>
  );
}
