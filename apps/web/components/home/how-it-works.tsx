import Link from 'next/link';
import { ArrowRight, BadgeCheck, FileSignature, Send, Sparkles } from 'lucide-react';
import { Button } from '@repo/ui/button';

const STEPS = [
  { icon: Send, title: 'Send a brief', body: 'Tell us the event, date, city and budget.' },
  { icon: BadgeCheck, title: 'We confirm', body: 'We check availability with the artist’s team.' },
  { icon: FileSignature, title: 'Sign and pay', body: 'Approve the itemised quote and pay the advance.' },
  { icon: Sparkles, title: 'Enjoy the show', body: 'We handle travel, stay and the day itself.' },
];

/** How it works: four numbered steps joined by a line, then one call to action. */
export function HowItWorks({ showFullProcessLink = true, showHeading = true }: { showFullProcessLink?: boolean; showHeading?: boolean }) {
  return (
    <section aria-labelledby={showHeading ? 'hiw-title' : undefined} aria-label={showHeading ? undefined : 'How it works'} className="py-20 md:py-28">
      <div className="shell">
        {showHeading && (
          <header className="mx-auto max-w-xl text-center">
            <p className="eyebrow mb-3">How it works</p>
            <h2 id="hiw-title" className="font-display text-h1 font-extrabold">
              Booking talent is simple
            </h2>
          </header>
        )}

        <ol className="relative mx-auto mt-12 grid max-w-5xl gap-10 sm:grid-cols-2 md:mt-16 lg:grid-cols-4 lg:gap-8">
          {/* Line joining the steps (large screens) */}
          <span aria-hidden className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px bg-border-strong lg:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col items-center text-center">
              <span className="relative grid size-12 place-items-center rounded-full border border-border-strong bg-bg text-primary-text">
                <s.icon className="size-5" aria-hidden />
                <span className="tabular absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-brand-gradient text-[0.6875rem] font-bold text-primary-fg">{i + 1}</span>
              </span>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 max-w-[16rem] text-sm text-fg-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 md:mt-16">
          <Button asChild size="lg">
            <Link href="/enquire">
              Start a brief <ArrowRight aria-hidden />
            </Link>
          </Button>
          {showFullProcessLink && (
            <Button asChild size="lg" variant="outline">
              <Link href="/how-it-works">See the full process</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
