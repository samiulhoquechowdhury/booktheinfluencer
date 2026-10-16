'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Download, FileSignature, FileText, MessageCircle, Phone, Receipt, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomerBooking, PayIntent } from '@repo/schemas';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { MilestoneCard } from '@repo/ui/milestone-card';
import { Skeleton } from '@repo/ui/skeleton';
import { StatusTimeline } from '@repo/ui/status-timeline';
import { TabPanel, Tabs } from '@repo/ui/tabs';
import { EVENT_TYPE_LABELS, deriveTimeline, formatDate, formatDateTime, formatINR, formatTime } from '@repo/utils';
import { ApiError } from '@/lib/api/client';
import { useBooking, usePayIntent } from '@/lib/api/hooks';
import { nextAction } from '@/lib/booking/next-action';
import { cityName } from '@/lib/reference';
import { useScrollLock } from '@/lib/motion';
import { QuotePanel } from './quote-panel';

const DOC_ICON = { QUOTE_PDF: FileText, CONTRACT: FileSignature, RECEIPT: Receipt, INVOICE: Receipt, RIDER: ScrollText } as const;

export function BookingDetail({ bookingRef }: { bookingRef: string }) {
  const q = useBooking(bookingRef);
  const [tab, setTab] = useState('quote');

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      </div>
    );
  }
  if (q.isError || !q.data) {
    const nf = q.error instanceof ApiError && q.error.status === 404;
    return <EmptyState art={nf ? 'search' : 'error'} title={nf ? 'Booking not found' : 'We couldn’t load this booking'} description={q.error instanceof ApiError ? q.error.message : undefined} action={nf ? <Button asChild><Link href="/account">Back to bookings</Link></Button> : <Button onClick={() => void q.refetch()}>Try again</Button>} />;
  }
  const b = q.data;
  const quoteAccepted = b.quotes.some((x) => x.status === 'ACCEPTED');
  const steps = deriveTimeline({ stage: b.stage, availability: b.availability, quoteAccepted, contractSigned: b.contract.status === 'SIGNED', advancePaid: b.advancePaid });
  const action = nextAction(b);

  return (
    <div className="pb-10">
      <Link href="/account" className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> All bookings</Link>

      <header className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end">
        <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl md:w-32">
          <Image src={b.talent.image.src} alt={b.talent.image.alt} fill sizes="(min-width: 768px) 128px, 96px" className="object-cover" priority placeholder={b.talent.image.blurDataURL ? 'blur' : 'empty'} blurDataURL={b.talent.image.blurDataURL} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="tabular text-sm text-fg-muted">{b.ref} · Brief {b.leadRef}</p>
          <h1 className="mt-1 font-display text-h1 font-black">{b.event.title}</h1>
          <p className="mt-2 text-fg-muted">
            <Link href={`/t/${b.talent.slug}`} className="font-semibold text-fg hover:underline">{b.talent.name}</Link> · {EVENT_TYPE_LABELS[b.event.type]} · {formatDate(b.event.date)}, {formatTime(b.event.startTime)} · {cityName(b.event.city)}
          </p>
        </div>
        <AvailabilityPill status={b.availability} className="self-start md:self-end" />
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr] xl:gap-16">
        <aside className="space-y-8">
          <section aria-labelledby="progress-title">
            <h2 id="progress-title" className="eyebrow mb-5">Progress</h2>
            <StatusTimeline steps={steps} hints={{ AVAILABILITY: b.availability === 'UNAVAILABLE' ? 'Not available on this date' : undefined, CONFIRMED: 'Contract + advance + representative sign-off' }} />
          </section>
          <section aria-labelledby="mgr-title" className="rounded-2xl border border-border p-5">
            <h2 id="mgr-title" className="eyebrow">Your manager</h2>
            <p className="mt-2 font-semibold">{b.manager.name}</p>
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm"><a href={`tel:${b.manager.phone.replace(/\s/g, '')}`}><Phone aria-hidden /> Call</a></Button>
              <Button asChild variant="outline" size="sm"><a href={`https://wa.me/${b.manager.whatsapp.replace('+', '')}?text=${encodeURIComponent(`Hi ${b.manager.name.split(' ')[0]}, about ${b.ref}`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> WhatsApp</a></Button>
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-10">
          <ActionCard booking={b} action={action} onGoTo={setTab} />

          <Tabs
            value={tab}
            onValueChange={setTab}
            layoutId="booking-tabs"
            items={[
              { value: 'quote', label: 'Quote', count: b.quotes.length || undefined },
              { value: 'contract', label: 'Contract' },
              { value: 'payments', label: 'Payments', count: b.milestones.length || undefined },
              { value: 'documents', label: 'Documents', count: b.documents.length || undefined },
              { value: 'brief', label: 'Brief' },
            ]}
          >
            <TabPanel value="quote"><QuotePanel booking={b} /></TabPanel>
            <TabPanel value="contract"><ContractPanel booking={b} /></TabPanel>
            <TabPanel value="payments"><PaymentsPanel booking={b} /></TabPanel>
            <TabPanel value="documents">
              {b.documents.length === 0 ? (
                <EmptyState art="inbox" title="No documents yet" description="Quotes, contracts and receipts appear here as they’re issued." />
              ) : (
                <ul className="divide-y divide-border rounded-2xl border border-border">
                  {b.documents.map((d) => {
                    const Icon = DOC_ICON[d.kind];
                    return (
                      <li key={d.id} className="flex items-center gap-4 p-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2"><Icon className="size-5" aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{d.name}</span>
                          <span className="tabular block text-xs text-fg-muted">{formatDateTime(d.uploadedAt)} · {d.sizeKb} KB</span>
                        </span>
                        <Button variant="ghost" size="icon" aria-label={`Download ${d.name}`} onClick={() => toast('Demo mode', { description: 'Documents download via a short-lived secure link.' })}>
                          <Download className="size-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabPanel>
            <TabPanel value="brief">
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {[
                  ['Event', `${b.event.title} (${EVENT_TYPE_LABELS[b.event.type]})`],
                  ['Date & time', `${formatDate(b.event.date)} · ${formatTime(b.event.startTime)}`],
                  ['Venue', `${b.event.venue}, ${cityName(b.event.city)}`],
                  ['Audience', `${new Intl.NumberFormat('en-IN').format(b.event.audienceSize)} guests`],
                  ['Duration', `${b.event.durationMins} minutes`],
                  ['Submitted', formatDateTime(b.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="border-b border-border pb-4">
                    <dt className="text-xs text-fg-muted">{k}</dt>
                    <dd className="mt-1 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              {b.notes && <p className="mt-6 rounded-xl bg-surface p-4 text-sm"><span className="font-semibold">Notes: </span>{b.notes}</p>}
              <h3 className="eyebrow mt-10 mb-4">Activity</h3>
              <ol className="space-y-3">
                {b.activity.slice().reverse().map((a, i) => (
                  <li key={i} className="flex gap-4 text-sm">
                    <span className="tabular w-40 shrink-0 text-fg-muted">{formatDateTime(a.at)}</span>
                    <span>{a.label}</span>
                  </li>
                ))}
              </ol>
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ booking, action, onGoTo }: { booking: CustomerBooking; action: ReturnType<typeof nextAction>; onGoTo: (tab: string) => void }) {
  const tone = action.kind === 'done' ? 'from-[color-mix(in_oklab,var(--success)_22%,transparent)]' : action.kind === 'alternatives' ? 'from-[color-mix(in_oklab,var(--danger)_18%,transparent)]' : 'from-[var(--glow-1)]';
  return (
    <section aria-labelledby="action-title" className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${tone} to-transparent p-6 sm:p-8`}>
      <p className="eyebrow">Next step</p>
      <h2 id="action-title" className="mt-2 font-display text-h2 font-extrabold">{action.title}</h2>
      <p className="mt-2 max-w-xl text-fg-muted">{action.body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {action.kind === 'review_quote' && <Button onClick={() => onGoTo('quote')}>Review quote <ArrowRight aria-hidden /></Button>}
        {action.kind === 'sign_contract' && <Button onClick={() => onGoTo('contract')}>Open contract <ArrowRight aria-hidden /></Button>}
        {action.kind === 'pay' && <Button onClick={() => onGoTo('payments')}>Pay <span className="tabular">{formatINR(action.amountPaise)}</span> <ArrowRight aria-hidden /></Button>}
        {action.kind === 'alternatives' && <Button asChild><Link href={`/talent/${booking.talent.primaryCategory}?city=${booking.event.city}&date=${booking.event.date}`}>See alternatives <ArrowRight aria-hidden /></Link></Button>}
      </div>
    </section>
  );
}

function ContractPanel({ booking }: { booking: CustomerBooking }) {
  const c = booking.contract;
  if (c.status === 'NOT_SENT') return <EmptyState art="inbox" title="Contract not issued yet" description="It’s prepared after you accept the quote, and covers scope, schedule, rider, cancellation and payment terms." />;
  return (
    <div className="rounded-2xl border border-border p-6">
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-xl bg-surface-2"><FileSignature className="size-6" aria-hidden /></span>
        <div>
          <p className="font-semibold">Booking contract — {booking.talent.name}</p>
          <p className="text-sm text-fg-muted">{c.status === 'SIGNED' && c.signedAt ? `Signed ${formatDateTime(c.signedAt)}` : c.sentAt ? `Sent for e-sign ${formatDateTime(c.sentAt)}` : ''}</p>
        </div>
      </div>
      {c.status === 'SENT' && (
        <Button className="mt-6" onClick={() => toast('Demo mode', { description: 'You’d be taken to the e-sign provider. Status updates when they confirm your signature.' })}>
          Review & e-sign <ArrowRight aria-hidden />
        </Button>
      )}
    </div>
  );
}

function PaymentsPanel({ booking }: { booking: CustomerBooking }) {
  const pay = usePayIntent(booking.ref);
  const [intent, setIntent] = useState<PayIntent | null>(null);
  useScrollLock(!!intent);
  if (booking.milestones.length === 0) return <EmptyState art="calendar" title="No payments scheduled" description="Your payment schedule appears here once you accept a quote." />;
  return (
    <div className="space-y-3">
      {booking.milestones.map((m) => (
        <MilestoneCard
          key={m.id}
          milestone={m}
          action={
            m.status === 'DUE' || m.status === 'OVERDUE' ? (
              <Button onClick={() => pay.mutate(m.id, { onSuccess: setIntent, onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Couldn’t start payment.') })} disabled={pay.isPending}>
                {pay.isPending ? 'Opening…' : 'Pay securely'}
              </Button>
            ) : null
          }
        />
      ))}
      <p className="pt-2 text-xs text-fg-subtle">Payment status updates only after the payment gateway confirms — never from this screen.</p>
      <Dialog.Root open={!!intent} onOpenChange={(v) => !v && setIntent(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[96] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elevated p-6 shadow-float">
            <Dialog.Title className="font-display text-2xl font-extrabold">Secure payment</Dialog.Title>
            <Dialog.Description className="mt-3 text-sm text-fg-muted">{intent?.message}</Dialog.Description>
            {intent && <p className="tabular mt-5 font-display text-4xl font-black">{formatINR(intent.amountPaise)}</p>}
            <Dialog.Close asChild><Button className="mt-6 w-full">Close</Button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
