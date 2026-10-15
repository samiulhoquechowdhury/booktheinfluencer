import type { Metadata } from 'next';
import { PageIntro } from '@/components/content/page-intro';
import { Reveal, RevealItem, SplitText } from '@/lib/motion';

export const metadata: Metadata = {
  title: 'About',
  description: 'A managed talent booking platform for India — honest availability, transparent pricing and written terms for every booking.',
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  ['Request, don’t pretend', 'Nothing is booked on the spot. We verify every date with the authorised representative first.'],
  ['Ranges until it’s real', 'Profiles show indicative bands. Only a verified quote shows a final number.'],
  ['Representation, labelled', 'Every profile says who manages the artist — and whether we’ve verified it.'],
  ['Everyone sees their number', 'Customers see what they pay. Talent see what they’re paid. Nobody is surprised.'],
  ['No false endorsement', 'We never imply an artist endorses us or is exclusively represented by us.'],
  ['People first', 'Software makes our managers fast; it doesn’t replace them on high-value bookings.'],
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title={<>Built for the <span className="font-serif font-normal normal-case italic">people</span> behind the stage.</>}
        lead="Booking a singer, DJ, comedian or speaker in India still means unclear prices, verbal promises and advance payments on trust. We’re fixing that — one written, verified, well-run booking at a time."
      />
      <section className="border-t border-border py-24 md:py-36">
        <div className="shell">
          <SplitText as="h2" by="word" className="max-w-5xl font-display text-display font-extrabold" lines={['Six promises we', 'build every screen around.']} />
          <Reveal stagger as="ol" className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(([t, b], i) => (
              <RevealItem as="li" key={t} className="bg-bg p-8">
                <span className="tabular font-display text-5xl font-black text-transparent [-webkit-text-stroke:1.5px_var(--border-strong)]">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-6 font-display text-xl font-extrabold">{t}</h3>
                <p className="mt-2 text-fg-muted">{b}</p>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
