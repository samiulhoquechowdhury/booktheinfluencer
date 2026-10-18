import type { ReactNode } from 'react';
import { FooterGate } from '@/components/shell/footer-gate';
import { SiteHeader } from '@/components/shell/site-header';
import { ScrollProgress } from '@/lib/motion';
import { getNavData } from '@/lib/nav';

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const nav = await getNavData();
  return (
    <>
      <ScrollProgress />
      <SiteHeader nav={nav} />
      <main id="main">{children}</main>
      <FooterGate />
    </>
  );
}
