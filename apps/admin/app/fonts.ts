import localFont from 'next/font/local';
import { Inter } from 'next/font/google';

export const cabinet = localFont({
  src: [
    { path: '../../../packages/ui/src/fonts/CabinetGrotesk-Bold.woff2', weight: '700' },
    { path: '../../../packages/ui/src/fonts/CabinetGrotesk-Extrabold.woff2', weight: '800' },
  ],
  variable: '--font-cabinet',
  display: 'swap',
});
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
