import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** Oversized editorial header for listing pages. */
export function ListingHero({
  eyebrow,
  title,
  description,
  crumbs,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  crumbs: { href: string; label: string }[];
  aside?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] size-[40rem] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
      <div className="shell relative">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-muted">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden />}
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="text-fg">{c.label}</span>
                ) : (
                  <Link href={c.href} className="hover:text-fg">{c.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-4">{eyebrow}</p>
            <h1 className="font-display text-display font-black uppercase">{title}</h1>
            <p className="mt-6 max-w-2xl text-lg text-fg-muted">{description}</p>
          </div>
          {aside && <div className="lg:col-span-4">{aside}</div>}
        </div>
      </div>
    </header>
  );
}
