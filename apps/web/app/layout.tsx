import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '@/lib/brand';
import { cabinet, instrument, inter, interTight } from './fonts';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name} — Book verified talent for any event`, template: `%s · ${BRAND.name}` },
  description:
    'Singers, DJs, comedians, speakers and creators across India — with verified representation, contracts, secure payments and a dedicated manager.',
  openGraph: { type: 'website', siteName: BRAND.name, locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${cabinet.variable} ${inter.variable} ${interTight.variable} ${instrument.variable}`}
    >
      <body className="grain min-h-dvh overflow-x-clip">
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-fg px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
