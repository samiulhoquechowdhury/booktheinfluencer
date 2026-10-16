import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/shell/site-header';
import { AppFooter } from '@/components/shell/app-footer';
import { getNavData } from '@/lib/nav';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const nav = await getNavData();
  return (
    <>
      <SiteHeader nav={nav} />
      <main id="main" className="min-h-dvh pt-24 pb-24 md:pt-28">
        {children}
      </main>
      <AppFooter />
    </>
  );
}
