'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@repo/ui/lib/cn';

const LINKS = [
  { href: '/account', label: 'Bookings', match: (p: string) => p === '/account' || p.startsWith('/account/bookings') },
  { href: '/account/favourites', label: 'Favourites', match: (p: string) => p.startsWith('/account/favourites') },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="mb-10 flex gap-1 border-b border-border">
      {LINKS.map((l) => {
        const on = l.match(pathname);
        return (
          <Link key={l.href} href={l.href} aria-current={on ? 'page' : undefined} className={cn('relative px-3 py-3 text-sm font-medium', on ? 'text-fg' : 'text-fg-muted hover:text-fg')}>
            {l.label}
            {on && <motion.span layoutId="account-nav" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-gradient" />}
          </Link>
        );
      })}
    </nav>
  );
}
