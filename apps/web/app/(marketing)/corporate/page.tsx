import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Building2, FileText, Layers, Users } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { PageIntro } from '@/components/content/page-intro';
import { publicApi } from '@/lib/api/server';
import { Marquee, Parallax, Reveal, RevealItem } from '@/lib/motion';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Corporate & planner bookings',
  description: 'Talent for annual days, conferences, launches and award nights — with GST-ready paperwork, one point of contact and verified representation.',
  alternates: { canonical: '/corporate' },
};

const POINTS = [
  { icon: Layers, title: 'One brief, several options', body: 'Tell us the room and the budget; we shortlist acts that fit, with honest availability.' },
  { icon: FileText, title: 'GST-ready paperwork', body: 'Itemised quotes, proforma, contracts and receipts your finance team will accept.' },
  { icon: Users, title: 'A manager who has done this', body: 'Run-of-show, rider, travel and the day itself — coordinated by one person.' },
  { icon: Building2, title: 'Built for repeat events', body: 'Annual days, town halls, sales kick-offs. Your history and preferences carry over.' },
];

export default async function CorporatePage() {
  const all = await publicApi.talents.list({ pageSize: 48 });
  const imgs = all.items.flatMap((t) => t.images.slice(1, 2)).slice(0, 8);
  return (
    <>
      <PageIntro
        eyebrow="For corporates, planners & institutions"
        title={<>Your stage, <span className="font-serif font-normal normal-case italic">sorted.</span></>}
        lead="From a 300-person offsite to a 5,000-seat campus fest — we source, verify, contract and coordinate the talent so your team can run the event."
      >
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href="/enquire">Plan with an expert <ArrowUpRight aria-hidden /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/contact">Talk to sales</Link></Button>
        </div>
      </PageIntro>

      <Marquee speed={30} className="py-4" label="Recent event photography">
        {imgs.map((img, i) => (
          <div key={i} className="relative mr-4 h-56 w-44 shrink-0 overflow-hidden rounded-xl md:h-72 md:w-56">
            <Image src={img.src} alt="" fill sizes="224px" className="object-cover" />
          </div>
        ))}
      </Marquee>

      <section aria-labelledby="why-title" className="py-24 md:py-36">
        <div className="shell grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="why-title" className="font-display text-display font-extrabold">Why teams <span className="font-serif font-normal italic">come back</span></h2>
            <Parallax speed={0.1} className="relative mt-12 hidden aspect-[4/5] overflow-hidden rounded-2xl lg:block">
              {imgs[3] && <Image src={imgs[3].src} alt="" fill sizes="35vw" className="object-cover" />}
            </Parallax>
          </div>
          <Reveal stagger className="divide-y divide-border border-y border-border lg:col-span-7">
            {POINTS.map((p, i) => (
              <RevealItem key={p.title} className="grid grid-cols-[auto_1fr] gap-6 py-8">
                <span className="tabular font-display text-sm font-bold text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p.icon className="size-6 text-primary-text" aria-hidden />
                  <h3 className="mt-4 font-display text-2xl font-extrabold">{p.title}</h3>
                  <p className="mt-2 text-fg-muted">{p.body}</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
