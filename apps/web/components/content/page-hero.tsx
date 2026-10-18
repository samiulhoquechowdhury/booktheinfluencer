import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Content page opener. With `banner`: the banner sits under the navbar and the copy is
 * left-aligned below it with a breadcrumb (same layout as the talent page). Without: a centred
 * pill label, headline, lead and actions over a soft glow.
 */
export function PageHero({
  label,
  title,
  lead,
  children,
  banner,
  crumbs,
}: {
  label: string;
  title: ReactNode;
  lead: ReactNode;
  children?: ReactNode;
  banner?: ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  const pill = (
    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-semibold text-fg-muted">
      <span aria-hidden className="size-1.5 rounded-full bg-brand-gradient" />
      {label}
    </p>
  );

  if (banner) {
    return (
      <header className="relative pt-24 pb-10 md:pt-28 md:pb-12">
        <div className="shell">
          {banner}
          <div className="mt-10 max-w-3xl md:mt-14">
            {crumbs && (
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
            )}
            {pill}
            <h1 className="font-display text-h1 font-extrabold tracking-tight text-balance md:text-[3.5rem] md:leading-[1.02]">{title}</h1>
            <p className="mt-4 max-w-2xl text-base text-fg-muted md:text-lg">{lead}</p>
            {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="relative overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
      <div className="shell mx-auto max-w-3xl text-center">
        <div className="flex justify-center">{pill}</div>
        <h1 className="font-display text-display font-extrabold tracking-tight text-balance">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-fg-muted">{lead}</p>
        {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
