import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/shell/site-header';

export default function FlowLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader variant="minimal" />
      <main id="main" className="relative min-h-dvh overflow-hidden pt-24 pb-24 md:pt-28">
        <div aria-hidden className="pointer-events-none absolute -top-48 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,var(--glow-1),transparent_65%)]" />
        <div className="relative">{children}</div>
      </main>
    </>
  );
}
