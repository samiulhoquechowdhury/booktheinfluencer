'use client';

import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, FileSignature, MapPin, ShieldCheck, Users } from 'lucide-react';
import type { AvailabilityStatus } from '@repo/schemas';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { formatINR } from '@repo/utils';

/** Tiny animated product mocks for the "How it works" scrub. Each plays when `active`. */

function useTyped(text: string, active: boolean, delay = 0) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) return setN(text.length);
    if (!active) return;
    setN(0);
    let i = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      id = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(id);
      }, 38);
    }, delay);
    return () => {
      clearTimeout(t);
      if (id) clearInterval(id);
    };
  }, [active, text, delay, reduce]);
  return text.slice(0, n);
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="relative w-full max-w-sm rounded-2xl border border-border bg-bg-elevated p-5 shadow-float">{children}</div>
);

export function BriefMock({ active }: { active: boolean }) {
  const a = useTyped('Annual Day · 600 guests', active, 200);
  const b = useTyped('Guwahati · Sat, 23 Jan', active, 1200);
  const c = useTyped('Singer — Assamese + Hindi', active, 2100);
  const rows = [
    { icon: Users, label: 'Event', v: a },
    { icon: MapPin, label: 'City & date', v: b },
    { icon: CalendarDays, label: 'Talent', v: c },
  ];
  return (
    <Card>
      <p className="eyebrow mb-4">Your brief</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-border bg-surface px-3 py-2">
            <p className="text-[0.6875rem] text-fg-muted">{r.label}</p>
            <p className="flex h-5 items-center gap-1.5 text-sm font-medium">
              <r.icon className="size-3.5 text-primary-text" aria-hidden />
              {r.v}
              <span className="h-4 w-px bg-primary-text motion-safe:animate-pulse" />
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 h-10 rounded-full bg-brand-gradient" />
    </Card>
  );
}

export function VerifyMock({ active }: { active: boolean }) {
  const [s1, setS1] = useState<AvailabilityStatus>('AWAITING_MANAGER');
  const [s2, setS2] = useState<AvailabilityStatus>('HOLD_REQUESTED');
  useEffect(() => {
    if (!active) return;
    setS1('AWAITING_MANAGER');
    setS2('HOLD_REQUESTED');
    const t1 = setTimeout(() => setS1('AVAILABLE'), 1100);
    const t2 = setTimeout(() => setS2('TENTATIVE'), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);
  return (
    <Card>
      <p className="eyebrow mb-4">Availability check</p>
      {[
        ['Aanya B.', s1],
        ['Ishita S.', s2],
      ].map(([name, s]) => (
        <div key={name} className="flex items-center justify-between border-b border-border py-3 last:border-0">
          <span className="text-sm font-semibold">{name}</span>
          <AvailabilityPill status={s as AvailabilityStatus} size="sm" />
        </div>
      ))}
      <AnimatePresence>
        {s1 === 'AVAILABLE' && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 rounded-lg bg-gold-soft px-3 py-2 text-xs font-semibold text-gold-text">
            <ShieldCheck className="size-4" aria-hidden /> Confirmed with the authorised manager
          </motion.p>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function QuoteMock({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const total = 1_416_000; // rupees, display only
  const [v, setV] = useState(reduce ? total : 0);
  useEffect(() => {
    if (reduce || !active) return;
    const c = animate(0, total, { duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4, onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [active, reduce]);
  const lines = [['Talent fee', 1_000_000], ['Travel & stay', 62_000], ['Production', 55_000], ['Service fee', 83_000]] as const;
  return (
    <Card>
      <p className="eyebrow mb-4">Quote v2 · valid 10 days</p>
      <ul className="space-y-2 text-sm">
        {lines.map(([l, a], i) => (
          <motion.li key={l} className="flex justify-between" initial={false} animate={{ opacity: active || reduce ? 1 : 0.3, x: active || reduce ? 0 : -6 }} transition={{ delay: active ? i * 0.12 : 0 }}>
            <span className="text-fg-muted">{l}</span>
            <span className="tabular">{formatINR(BigInt(a) * 100n)}</span>
          </motion.li>
        ))}
      </ul>
      <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
        <span className="text-sm font-semibold">Total incl. GST</span>
        <span className="tabular font-display text-3xl font-extrabold tracking-tight">{formatINR(BigInt(v) * 100n)}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-fg-muted">
        <FileSignature className="size-4 text-primary-text" aria-hidden /> Contract + 50% advance to confirm
      </div>
    </Card>
  );
}

export function EnjoyMock({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<AvailabilityStatus>('TENTATIVE');
  useEffect(() => {
    if (!active) return;
    setStatus('TENTATIVE');
    const t = setTimeout(async () => {
      setStatus('CONFIRMED');
      if (reduce || !canvas.current) return;
      const confetti = (await import('canvas-confetti')).default;
      const fire = confetti.create(canvas.current, { resize: true, useWorker: true });
      void fire({ particleCount: 90, spread: 80, startVelocity: 38, origin: { y: 0.7 }, colors: ['#8b5cf6', '#d946ef', '#e3b341', '#ffffff'], scalar: 0.9 });
    }, 700);
    return () => clearTimeout(t);
  }, [active, reduce]);
  return (
    <Card>
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
      <p className="eyebrow mb-4">Booking BK-23987</p>
      <p className="font-display text-2xl font-extrabold tracking-tight">Techfest closing night</p>
      <p className="mt-1 text-sm text-fg-muted">Sun, 8 Nov 2026 · 8:00 PM IST</p>
      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm text-fg-muted">Status</span>
        <AvailabilityPill status={status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.6875rem] text-fg-muted">
        {['Quote ✓', 'Contract ✓', 'Advance ✓'].map((x) => (
          <span key={x} className="rounded-md bg-surface py-1.5">{x}</span>
        ))}
      </div>
    </Card>
  );
}
