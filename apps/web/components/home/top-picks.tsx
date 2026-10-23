'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CategorySlug, PublicTalent } from '@repo/schemas';
import { SectionHeading } from '@repo/ui/section-heading';
import { cn } from '@repo/ui/lib/cn';
import { CATEGORIES } from '@/lib/reference';
import { TalentCard } from '@/components/talent/talent-card';

const MAX = 8;
const LABEL: Partial<Record<CategorySlug, string>> = { actors: 'Actors', speakers: 'Anchors' };

/** Top picks: a grid of the most-booked faces with category chips to narrow it down. */
export function TopPicks({ talents }: { talents: PublicTalent[] }) {
  const [cat, setCat] = useState<CategorySlug | 'all'>('all');
  const cats = CATEGORIES.filter((c) => talents.some((t) => t.categories.includes(c.slug)));
  const shown = (cat === 'all' ? talents : talents.filter((t) => t.categories.includes(cat))).slice(0, MAX);

  return (
    <section aria-labelledby="top-picks-title" className="py-16 md:py-24">
      <div className="shell">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Top picks"
            title={<span id="top-picks-title">Top picks <span className="font-serif font-normal italic">this season.</span></span>}
            description="The faces event planners ask for most. Each one is bookable through the same managed process."
          />
          <Link href="/talent" className="group flex shrink-0 items-center gap-2 font-semibold text-primary-text">
            See all talent <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        {cats.length > 1 && (
          <div role="group" aria-label="Filter top picks by category" className="no-scrollbar -mx-4 mt-9 flex gap-2 overflow-x-auto px-4">
            {[{ slug: 'all' as const, label: 'All' }, ...cats.map((c) => ({ slug: c.slug, label: LABEL[c.slug] ?? c.name }))].map((c) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={cat === c.slug}
                onClick={() => setCat(c.slug)}
                className={cn(
                  'h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors',
                  cat === c.slug ? 'border-transparent bg-fg text-bg' : 'border-border text-fg hover:border-border-strong hover:bg-surface-2',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-x-3 gap-y-8 min-[400px]:grid-cols-2 sm:gap-x-4 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {shown.map((t) => (
            <TalentCard key={t.slug} talent={t} sizes="(min-width: 1440px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 47vw" />
          ))}
        </div>
      </div>
    </section>
  );
}
