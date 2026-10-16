'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, animate, motion } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, ChevronDown, Clock, Loader2, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import type { CustomerBooking, CustomerQuote } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { Textarea } from '@repo/ui/field';
import { HoldToConfirm } from '@repo/ui/hold-to-confirm';
import { QuoteTable } from '@repo/ui/quote-table';
import { cn } from '@repo/ui/lib/cn';
import { daysUntil, formatDateTime, formatINR, paiseToDisplayRupees } from '@repo/utils';
import { ApiError } from '@/lib/api/client';
import { useDecideQuote } from '@/lib/api/hooks';
import { AcceptedOverlay } from './accepted-overlay';

const STATUS_LABEL: Record<CustomerQuote['status'], string> = {
  SENT: 'Awaiting your decision',
  ACCEPTED: 'Accepted',
  CHANGES_REQUESTED: 'Changes requested',
  EXPIRED: 'Expired',
  SUPERSEDED: 'Replaced by a newer version',
};

function AnimatedTotal({ paise }: { paise: bigint }) {
  const reduce = useReducedMotion();
  const target = paiseToDisplayRupees(paise);
  const [v, setV] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, target, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [target, reduce]);
  return (
    <span className="tabular">
      <span aria-hidden>{formatINR(BigInt(v) * 100n)}</span>
      <span className="sr-only">{formatINR(paise)}</span>
    </span>
  );
}

const ChangesSchema = z.object({ message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(1000) });

export function QuotePanel({ booking }: { booking: CustomerBooking }) {
  const decide = useDecideQuote(booking.ref);
  const [mode, setMode] = useState<'idle' | 'changes'>('idle');
  const [accepted, setAccepted] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const form = useForm<z.infer<typeof ChangesSchema>>({ resolver: zodResolver(ChangesSchema), defaultValues: { message: '' } });

  if (booking.quotes.length === 0) {
    return <EmptyState art="inbox" title="No quote yet" description="Your quote arrives once availability is confirmed — usually within 24 hours." />;
  }
  const [current, ...older] = booking.quotes;
  const q = current!;
  const daysLeft = daysUntil(q.validUntil);
  const open = q.status === 'SENT' && daysLeft >= 0;

  const accept = () =>
    decide.mutate(
      { quoteId: q.id, decision: { action: 'accept' } },
      {
        onSuccess: () => setAccepted(true),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Couldn’t accept the quote.'),
      },
    );

  const requestChanges = form.handleSubmit(({ message }) =>
    decide.mutate(
      { quoteId: q.id, decision: { action: 'request_changes', message } },
      {
        onSuccess: () => {
          setMode('idle');
          toast.success('Sent to your manager', { description: 'You’ll get a revised quote soon.' });
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Couldn’t send your request.'),
      },
    ),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-extrabold tracking-tight">Quote v{q.version}</p>
          <p className="text-sm text-fg-muted">Issued {formatDateTime(q.issuedAt)}</p>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', q.status === 'ACCEPTED' ? 'bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success' : open ? 'bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-warning' : 'bg-surface-2 text-fg-muted')}>
          {q.status === 'ACCEPTED' ? <CheckCircle2 className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
          {q.status === 'SENT' && daysLeft < 0 ? 'Expired' : STATUS_LABEL[q.status]}
          {open && <span className="font-normal">· {daysLeft === 0 ? 'expires today' : `${daysLeft} days left`}</span>}
        </span>
      </div>

      {q.notes && <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"><span className="font-semibold">From your manager: </span>{q.notes}</p>}

      <QuoteTable quote={q} totalSlot={<AnimatedTotal paise={q.totalPaise} />} />

      <div>
        <p className="eyebrow mb-3">Included</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {q.inclusions.map((x) => (
            <li key={x} className="flex gap-2 text-sm text-fg-muted"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{x}</li>
          ))}
        </ul>
      </div>

      {open && (
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <AnimatePresence mode="wait" initial={false}>
            {mode === 'idle' ? (
              <motion.div key="accept" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <p className="font-semibold">Happy with this quote?</p>
                <p className="mt-1 text-sm text-fg-muted">
                  Accepting records your acceptance with a timestamp. Your booking is confirmed only after the contract is signed, the advance is paid and the representative accepts.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <HoldToConfirm onConfirm={accept} disabled={decide.isPending}>
                    {decide.isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden /> Accepting…</span> : <>Hold to accept · <span className="tabular">{formatINR(q.totalPaise)}</span></>}
                  </HoldToConfirm>
                  <Button variant="outline" size="xl" className="h-16" onClick={() => setMode('changes')}>
                    <MessageSquareText aria-hidden /> Request changes
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form key="changes" onSubmit={requestChanges} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <p className="font-semibold">What should change?</p>
                <Textarea label="e.g. drop production, shorter set, different date" error={form.formState.errors.message?.message} {...form.register('message')} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setMode('idle')}>Cancel</Button>
                  <Button type="submit" disabled={decide.isPending}>{decide.isPending ? 'Sending…' : 'Send to manager'}</Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      )}
      {q.status === 'CHANGES_REQUESTED' && q.changeRequest && (
        <p className="rounded-xl border border-border px-4 py-3 text-sm text-fg-muted"><span className="font-semibold text-fg">Your request: </span>{q.changeRequest}</p>
      )}
      {q.acceptedAt && <p className="text-sm text-fg-muted">Accepted {formatDateTime(q.acceptedAt)}.</p>}

      {older.length > 0 && (
        <div className="border-t border-border pt-6">
          <button type="button" onClick={() => setShowOld((s) => !s)} aria-expanded={showOld} className="flex items-center gap-2 text-sm font-semibold">
            Version history ({older.length}) <ChevronDown className={cn('size-4 transition-transform', showOld && 'rotate-180')} aria-hidden />
          </button>
          <AnimatePresence>
            {showOld && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {older.map((o) => (
                  <li key={o.id} className="mt-4 rounded-xl border border-border p-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold">v{o.version} · {STATUS_LABEL[o.status]}</span>
                      <span className="tabular">{formatINR(o.totalPaise)}</span>
                    </div>
                    {o.changeRequest && <p className="mt-2 text-fg-muted">You asked: “{o.changeRequest}”</p>}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      <AcceptedOverlay open={accepted} onClose={() => setAccepted(false)} totalPaise={q.totalPaise} talent={booking.talent.name} />
    </div>
  );
}
