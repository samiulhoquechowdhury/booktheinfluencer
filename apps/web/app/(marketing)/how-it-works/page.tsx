import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, FileSignature, IndianRupee, PartyPopper } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { HowItWorks } from '@/components/home/how-it-works';
import { FaqSection } from '@/components/home/faq-section';
import { PageIntro } from '@/components/content/page-intro';
import { Reveal, RevealItem } from '@/lib/motion';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Brief → we verify → quote & contract → enjoy the event. How managed talent booking works, and when a booking is truly confirmed.',
  alternates: { canonical: '/how-it-works' },
};

const RULES = [
  { icon: BadgeCheck, title: 'Quote accepted', body: 'You accept the itemised quote online.' },
  { icon: FileSignature, title: 'Contract signed', body: 'You (and the rep, where needed) e-sign the contract.' },
  { icon: IndianRupee, title: 'Advance paid', body: 'The gateway confirms your advance payment.' },
  { icon: PartyPopper, title: 'Representative accepts', body: 'The authorised manager signs off on the booking.' },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title={<>Request. Verify. <span className="font-serif font-normal normal-case italic">Perform.</span></>}
        lead="Booking talent shouldn’t mean calling five agents and wiring money on trust. One brief, one manager, one booking record — from first message to final bow."
      />
      <HowItWorks />
      <section aria-labelledby="confirm-title" className="py-24 md:py-36">
        <div className="shell grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-5">The confirmation rule</p>
            <h2 id="confirm-title" className="font-display text-display font-extrabold">“Confirmed” means <span className="font-serif font-normal italic">confirmed.</span></h2>
            <p className="mt-6 text-lg text-fg-muted">We never mark a booking confirmed early. It happens automatically — and only — when all four of these are true.</p>
          </div>
          <Reveal stagger as="ol" className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {RULES.map((r, i) => (
              <RevealItem as="li" key={r.title} className="rounded-2xl border border-border bg-surface p-6">
                <span className="tabular font-display text-sm font-bold text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                <r.icon className="mt-6 size-7 text-gold" aria-hidden />
                <h3 className="mt-4 font-display text-xl font-extrabold">{r.title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{r.body}</p>
              </RevealItem>
            ))}
          </Reveal>
        </div>
        <div className="shell mt-16">
          <Button asChild size="lg"><Link href="/enquire">Start your brief <ArrowUpRight aria-hidden /></Link></Button>
        </div>
      </section>
      <FaqSection />
    </>
  );
}
