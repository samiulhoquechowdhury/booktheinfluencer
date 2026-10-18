import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { CategorySlug } from '@repo/schemas';
import { TalentBanner } from './talent-banner';

/**
 * Listing page header: full-width category banner under the navbar, then a compact breadcrumb,
 * eyebrow, sentence-case headline and one-line description.
 */
export function ListingHero({
  eyebrow,
  title,
  description,
  crumbs,
  aside,
  category,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  crumbs: { href: string; label: string }[];
  aside?: ReactNode;
  /** Banner to show first (category pages). */
  category?: CategorySlug;
}) {
  return (
    <header className="relative pt-24 pb-10 md:pt-28 md:pb-12">
      <div className="shell">
        <TalentBanner category={category} />

        <div className="mt-10 grid gap-6 md:mt-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-muted">
                {crumbs.map((c, i) => (
                  <li key={c.href} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden />}
                    {i === crumbs.length - 1 ? (
                      <span aria-current="page" className="text-fg">{c.label}</span>
                    ) : (
                      <Link href={c.href} className="transition-colors hover:text-fg">{c.label}</Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-semibold text-fg-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-brand-gradient" />
              {eyebrow}
            </p>
            <h1 className="font-display text-h1 font-extrabold tracking-tight md:text-[3.5rem] md:leading-[1.02]">{title}</h1>
            <p className="mt-4 max-w-2xl text-base text-fg-muted md:text-lg">{description}</p>
          </div>
          {aside && <div className="lg:col-span-4">{aside}</div>}
        </div>
      </div>
    </header>
  );
}
