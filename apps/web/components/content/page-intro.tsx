import type { ReactNode } from 'react';

/** Editorial page opener for content pages. */
export function PageIntro({ eyebrow, title, lead, children }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden pt-36 pb-16 md:pt-48 md:pb-24">
      <div aria-hidden className="pointer-events-none absolute -top-48 left-[-10%] size-[44rem] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
      <div aria-hidden className="pointer-events-none absolute top-10 right-[-15%] size-[30rem] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)]" />
      <div className="shell relative">
        <p className="eyebrow mb-6">{eyebrow}</p>
        <h1 className="max-w-5xl font-display text-hero font-black uppercase">{title}</h1>
        {lead && <p className="mt-8 max-w-2xl text-lg text-fg-muted md:text-xl">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
