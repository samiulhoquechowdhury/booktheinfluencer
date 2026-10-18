import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, FileSignature, IndianRupee, ShieldCheck } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { HowItWorks } from '@/components/home/how-it-works';
import { FaqSection } from '@/components/home/faq-section';
import { PageHero } from '@/components/content/page-hero';
import { Reveal, RevealItem } from '@/lib/motion';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Brief → we verify → quote & contract → enjoy the event. How managed talent booking works, and when a booking is truly confirmed.',
  alternates: { canonical: '/how-it-works' },
};

const RULES = [
  { icon: BadgeCheck, title: 'Quote accepted', body: 'You accept the itemised quote online.' },
  { icon: FileSignature, title: 'Contract signed', body: 'You, and the representative where needed, e-sign the contract.' },
  { icon: IndianRupee, title: 'Advance paid', body: 'The payment gateway confirms your advance.' },
  { icon: ShieldCheck, title: 'Representative accepts', body: 'The artist’s authorised manager signs off.' },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        label="How it works"
        title={<>Request. Verify. <span className="font-serif font-normal italic">Perform.</span></>}
        lead="One brief, one manager and one booking record, from your first message to the final bow."
      >
        <Button asChild size="lg">
          <Link href="/enquire">
            Start a brief <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/talent">Browse talent</Link>
        </Button>
      </PageHero>

      {/* Process player + closing banner */}
      <div className="-mt-10 md:-mt-14">
        <HowItWorks showFullProcessLink={false} showHeading={false} />
      </div>

      {/* Confirmation rule */}
      <section aria-labelledby="confirm-title" className="border-t border-border py-20 md:py-28">
        <div className="shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">The confirmation rule</p>
            <h2 id="confirm-title" className="font-display text-h1 font-extrabold tracking-tight md:text-[3rem] md:leading-[1.05]">
              “Confirmed” means <span className="font-serif font-normal italic">confirmed.</span>
            </h2>
            <p className="mt-4 text-fg-muted md:text-lg">We never mark a booking confirmed early. It happens only when all four of these are true.</p>
          </div>
          <Reveal stagger as="ul" className="mt-14 grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
            {RULES.map((r) => (
              <RevealItem as="li" key={r.title} className="flex flex-col items-center px-6 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary-text ring-1 ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]">
                  <r.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-base font-semibold">{r.title}</h3>
                <p className="mt-1.5 max-w-[16rem] text-sm text-fg-muted">{r.body}</p>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <FaqSection />
    </>
  );
}
