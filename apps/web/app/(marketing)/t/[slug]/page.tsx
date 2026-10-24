import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Accordion } from '@repo/ui/accordion';
import { EVENT_TYPE_LABELS } from '@repo/utils';
import { BookingCard } from '@/components/profile/booking-card';
import { BookingDock } from '@/components/profile/booking-dock';
import { Gallery } from '@/components/profile/gallery';
import { ProfileHero } from '@/components/profile/profile-hero';
import { TalentCard } from '@/components/talent/talent-card';
import { ApiError } from '@/lib/api/transport';
import { publicApi } from '@/lib/api/server';
import { categoryName, categorySingular, cityName } from '@/lib/reference';
import { JsonLd, breadcrumbLd, personLd } from '@/lib/seo/json-ld';

/** trd §13: catalogue pages refresh every 5 minutes, and at once when the API pings /api/revalidate. */
export const revalidate = 300;

export async function generateStaticParams() {
  const all = await publicApi.talents.list({ pageSize: 48 });
  return all.items.map((t) => ({ slug: t.slug }));
}

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await publicApi.talents.bySlug(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await load((await params).slug);
  if (!t) return { title: 'Talent not found' };
  const title = `${t.name} — ${categorySingular(t.primaryCategory)} in ${cityName(t.baseCity)}`;
  return {
    title,
    description: `${t.tagline}. ${t.languages.join(', ')}. Check availability and get an itemised quote.`,
    alternates: { canonical: `/t/${t.slug}` },
    openGraph: { title, description: t.tagline, images: [{ url: t.images[0]!.src.split('#')[0]!, width: t.images[0]!.width, height: t.images[0]!.height, alt: t.images[0]!.alt }] },
  };
}

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="scroll-mt-28 border-t border-border py-10 first:border-t-0 first:pt-0 md:py-12">
    <h2 id={id} className="mb-5 font-display text-2xl font-extrabold tracking-tight">{title}</h2>
    {children}
  </section>
);

const Chip = ({ children }: { children: React.ReactNode }) => <li className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">{children}</li>;

const STEPS = [
  { title: 'Send a request', body: 'Pick a date and tell us about the event. It’s free.' },
  { title: 'We confirm', body: 'We check with the artist’s team and reply within 24 hours.' },
  { title: 'Approve and pay', body: 'Accept the itemised quote and pay the advance online.' },
];

export default async function TalentProfilePage({ params }: Props) {
  const t = await load((await params).slug);
  if (!t) notFound();
  const similar = await publicApi.talents.similar(t.slug);

  return (
    <>
      <JsonLd data={personLd(t)} />
      <JsonLd data={breadcrumbLd([{ name: 'Talent', path: '/talent' }, { name: categoryName(t.primaryCategory), path: `/talent/${t.primaryCategory}` }, { name: t.name, path: `/t/${t.slug}` }])} />
      <ProfileHero talent={t} />

      <div className="shell mt-14 pb-16 md:mt-20 lg:pb-24">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <div>
            <Section id="about" title={`About ${t.name.split(' ')[0]}`}>
              <p className="max-w-3xl text-lg leading-relaxed text-fg-muted">{t.bio}</p>
            </Section>

            <Section id="gallery" title="Photos">
              <Gallery images={t.images} showreelUrl={t.showreelUrl} name={t.name} />
            </Section>

            <Section id="performs" title="Available for">
              <ul className="flex flex-wrap gap-2">
                {t.eventTypes.map((e) => <Chip key={e}>{EVENT_TYPE_LABELS[e]}</Chip>)}
              </ul>
              <h3 className="mt-6 mb-3 text-sm font-semibold text-fg-muted">Languages</h3>
              <ul className="flex flex-wrap gap-2">
                {t.languages.map((l) => <Chip key={l}>{l}</Chip>)}
              </ul>
            </Section>

            {t.pastEvents.length > 0 && (
              <Section id="past" title="Past events">
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {t.pastEvents.map((e) => (
                    <li key={`${e.title}-${e.year}`} className="flex items-baseline justify-between gap-6 px-5 py-4">
                      <span className="font-medium">{e.title}</span>
                      <span className="tabular shrink-0 text-sm text-fg-muted">{e.city} · {e.year}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {t.riderSummary && (
              <Section id="rider" title="Rider summary">
                <p className="max-w-2xl text-fg-muted">{t.riderSummary}</p>
              </Section>
            )}

            <Section id="process" title="How booking works">
              <ol className="grid gap-3 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="rounded-2xl border border-border bg-surface p-5">
                    <span className="tabular grid size-8 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-primary-fg">{i + 1}</span>
                    <p className="mt-4 font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm text-fg-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            </Section>

            {t.faqs.length > 0 && (
              <Section id="faq" title="Questions">
                <Accordion items={t.faqs} />
              </Section>
            )}
          </div>

          <aside aria-label="Booking" className="hidden lg:block">
            <div className="sticky top-28">
              <BookingCard talent={t} />
            </div>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar-title" className="border-t border-border py-16 md:py-20">
          <div className="shell">
            <h2 id="similar-title" className="mb-8 font-display text-2xl font-extrabold tracking-tight md:text-3xl">You might also like</h2>
            <div className="grid grid-cols-1 gap-x-3 gap-y-8 min-[400px]:grid-cols-2 sm:gap-x-4 md:grid-cols-4 md:gap-x-6">
              {similar.map((s) => (
                <TalentCard key={s.slug} talent={s} sizes="(min-width: 1440px) 300px, (min-width: 768px) 23vw, 47vw" />
              ))}
            </div>
          </div>
        </section>
      )}
      {/* Room so the floating dock never covers the last section. */}
      <div aria-hidden className="h-28" />
      <BookingDock talent={t} />
    </>
  );
}
