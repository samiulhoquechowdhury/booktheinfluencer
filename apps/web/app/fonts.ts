import localFont from 'next/font/local';
import { Inter, Inter_Tight, Instrument_Serif } from 'next/font/google';

/** Self-hosted at build time by next/font (no runtime requests to Google). */
/** Static instances (not the variable file): their outlines have no overlapping contours, so
 * `-webkit-text-stroke` outline type renders cleanly. */
export const cabinet = localFont({
  src: [
    { path: '../../../packages/ui/src/fonts/CabinetGrotesk-Medium.woff2', weight: '500' },
    { path: '../../../packages/ui/src/fonts/CabinetGrotesk-Bold.woff2', weight: '700' },
    { path: '../../../packages/ui/src/fonts/CabinetGrotesk-Extrabold.woff2', weight: '800' },
    { path: '../../../packages/ui/src/fonts/CabinetGrotesk-Black.woff2', weight: '900' },
  ],
  variable: '--font-cabinet',
  display: 'swap',
});

export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-inter-tight',
  display: 'swap',
  preload: false,
});

export const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  variable: '--font-instrument',
  display: 'swap',
});
