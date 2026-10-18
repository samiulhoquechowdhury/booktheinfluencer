import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Info } from 'lucide-react';
import { Accordion } from '@repo/ui/accordion';
import { EVENT_TYPE_LABELS } from '@repo/utils';
import { BookingDock } from '@/components/profile/booking-dock';
import { Gallery } from '@/components/profile/gallery';
import { ProfileHero } from '@/components/profile/profile-hero';
import { TalentCard } from '@/components/talent/talent-card';
import { ApiError } from '@/lib/api/transport';
import { publicApi } from '@/lib/api/server';
import { categoryName, categorySingular, cityName } from '@/lib/reference';
import { JsonLd, breadcrumbLd, personLd } from '@/lib/seo/json-ld';
import { Reveal, RevealItem } from '@/lib/motion';

export const revalidate = 3600;

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
  <section aria-labelledby={id} className="border-t border-border py-12 md:py-16">
    <h2 id={id} className="eyebrow mb-6">{title}</h2>
    {children}
  </section>
);

export default async function TalentProfilePage({ params }: Props) {
  const t = await load((await params).slug);
  if (!t) notFound();
  const similar = await publicApi.talents.similar(t.slug);

  return (
    <>
      <JsonLd data={personLd(t)} />
      <JsonLd data={breadcrumbLd([{ name: 'Talent', path: '/talent' }, { name: categoryName(t.primaryCategory), path: `/talent/${t.primaryCategory}` }, { name: t.name, path: `/t/${t.slug}` }])} />
      <ProfileHero talent={t} />

      <div className="shell mt-12 pb-16 md:mt-16 lg:mt-24 lg:pb-24">
        <div className="mx-auto max-w-4xl">
          <Gallery images={t.images} showreelUrl={t.showreelUrl} name={t.name} />

          <Section id="about" title="About">
            <Reveal>
              <p className="max-w-3xl text-xl leading-relaxed text-fg md:text-2xl">{t.bio}</p>
            </Reveal>
          </Section>

          <Section id="performs" title="Performs at">
            <Reveal stagger as="ul" className="flex flex-wrap gap-2">
              {t.eventTypes.map((e) => (
                <RevealItem as="li" key={e} className="rounded-full border border-border px-4 py-2 font-medium">
                  {EVENT_TYPE_LABELS[e]}
                </RevealItem>
              ))}
            </Reveal>
          </Section>

          <Section id="languages" title="Languages">
            <p className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">{t.languages.join(' · ')}</p>
          </Section>

          <Section id="past" title="Past events">
            <ul className="divide-y divide-border">
              {t.pastEvents.map((e) => (
                <li key={`${e.title}-${e.year}`} className="flex items-baseline justify-between gap-6 py-4">
                  <span className="font-semibold">{e.title}</span>
                  <span className="tabular shrink-0 text-sm text-fg-muted">{e.city} · {e.year}</span>
                </li>
              ))}
            </ul>
          </Section>

          {t.riderSummary && (
            <Section id="rider" title="Rider summary">
              <p className="max-w-2xl text-fg-muted">{t.riderSummary}</p>
            </Section>
          )}

          <Section id="faq" title="FAQ">
            <Accordion items={t.faqs} />
          </Section>

          <p className="mt-2 flex gap-2 text-xs text-fg-subtle">
            <Info className="size-4 shrink-0" aria-hidden />
            Fees and availability are confirmed with the authorised representative before booking.
          </p>
        </div>

      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar-title" className="border-t border-border py-20">
          <div className="shell">
            <h2 id="similar-title" className="mb-10 font-display text-h1 font-extrabold">
              You might also <span className="font-serif font-normal italic">like</span>
            </h2>
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
