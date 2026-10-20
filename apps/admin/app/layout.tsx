import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cabinet, inter } from './fonts';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BookTheInfluencer Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${cabinet.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
