'use client';

import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/lib/cn';
import { Magnetic } from '@/lib/motion';
import { AccountMenu } from './account-menu';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { NAV_LINKS } from './nav-links';
import { ThemeToggle } from './theme-toggle';

/** Fixed header: transparent at top, glass once scrolled; hides on scroll down, returns on scroll up. */
export function SiteHeader({ variant = 'full' }: { variant?: 'full' | 'minimal' }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(!reduce && y > 240 && y > prev + 2);
    if (y < prev - 2) setHidden(false);
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50"
      animate={{ y: hidden ? '-110%' : '0%' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={cn('transition-[background-color,border-color,backdrop-filter] duration-(--duration-slow)', scrolled ? 'glass border-x-0 border-t-0' : 'border-b border-transparent')}>
        <div className="shell flex h-16 items-center gap-4 md:h-[72px]">
          <Logo />
          {variant === 'full' && (
            <nav aria-label="Primary" className="ml-8 hidden lg:block" onMouseLeave={() => setHover(null)}>
              <ul className="flex items-center gap-1">
                {NAV_LINKS.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                  return (
                    <li key={l.href} className="relative">
                      <Link
                        href={l.href}
                        onMouseEnter={() => setHover(l.href)}
                        aria-current={active ? 'page' : undefined}
                        className={cn('relative z-10 block rounded-full px-4 py-2 text-sm font-medium transition-colors', active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
                      >
                        {l.label}
                      </Link>
                      {(hover ?? (active ? l.href : null)) === l.href && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-full bg-surface-2"
                          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <AccountMenu />
            {variant === 'full' && (
              <Magnetic className="hidden md:inline-flex">
                <Button asChild size="md">
                  <Link href="/enquire">
                    Plan with an expert <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              </Magnetic>
            )}
            {variant === 'full' && <MobileMenu />}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
