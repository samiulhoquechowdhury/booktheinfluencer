'use client';

import { usePathname } from 'next/navigation';
import { SiteFooter } from './site-footer';

/** Footer for marketing pages, except talent profiles (they end with the floating booking dock). */
export function FooterGate() {
  const pathname = usePathname();
  if (pathname.startsWith('/t/')) return null;
  return <SiteFooter />;
}
