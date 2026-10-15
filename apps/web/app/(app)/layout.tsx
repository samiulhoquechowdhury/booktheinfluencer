import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/shell/site-header';
import { AppFooter } from '@/components/shell/app-footer';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-dvh pt-24 pb-24 md:pt-28">
        {children}
      </main>
      <AppFooter />
    </>
  );
}
