'use client';

import { NavigationMenu } from 'radix-ui';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/lib/cn';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { Magnetic } from '@/lib/motion';
import { AccountMenu } from './account-menu';
import { Logo } from './logo';
import { TalentMegaMenu } from './mega-menu';
import { MobileMenu } from './mobile-menu';
import { NAV_LINKS } from './nav-links';
import type { NavData } from './nav-types';
import { SearchButton } from './search-palette';
import { ThemeToggle } from './theme-toggle';

const linkCls = 'relative z-10 flex h-10 items-center gap-1 rounded-full px-3 text-sm whitespace-nowrap xl:px-4 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Floating capsule header. Transparent over the hero; a glass capsule fades in once scrolled
 * (opacity/transform only). Hides on scroll down, returns on scroll up.
 */
export function SiteHeader({ variant = 'full', nav }: { variant?: 'full' | 'minimal'; nav?: NavData }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [menu, setMenu] = useState('');

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    if (menu) return; // never hide while the mega menu is open
    if (!reduce && y > 240 && y > prev + 2) setHidden(true);
    else if (y < prev - 2) setHidden(false);
  });

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const talentActive = isActive('/talent') || isActive('/t');
  const pillOn = (key: string, active: boolean) => (hover ?? (menu ? 'talent' : null) ?? (active ? key : null)) === key;
  const others = NAV_LINKS.filter((l) => l.href !== '/talent');

  return (
    <>
    <motion.header
      className="fixed inset-x-0 top-0 z-50 pt-2 md:pt-3"
      animate={{ y: hidden ? '-120%' : '0%' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="shell">
        <div
          className="relative flex h-14 items-center gap-2 rounded-full pr-1.5 pl-4 [--lg-hover:0.6] hover:[--lg-hover:1] md:h-16 md:pr-2 md:pl-6"
          onPointerMove={(e) => {
            // Drive the glass highlight from the pointer (CSS vars only — no re-render).
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
          }}
        >
          {/* Capsule surface */}
          <motion.div
            aria-hidden
            className="liquid-glass pointer-events-none absolute inset-0 rounded-full"
            initial={false}
            animate={{ opacity: scrolled || menu ? 1 : 0.85, scale: scrolled || menu ? 1 : 0.985 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Light mode, page at the top: the glass edge is white-on-white, so outline the capsule. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 rounded-full border border-[color-mix(in_oklab,var(--fg)_14%,transparent)] shadow-[0_6px_20px_-12px_rgb(17_17_20/0.25)] transition-opacity duration-300 dark:hidden',
              scrolled || menu ? 'opacity-0' : 'opacity-100',
            )}
          />

          <Logo className="relative" />

          {variant === 'full' && (
            <NavigationMenu.Root
              value={menu}
              onValueChange={setMenu}
              delayDuration={60}
              aria-label="Primary"
              className="ml-6 hidden lg:block xl:ml-10"
              onMouseLeave={() => setHover(null)}
            >
              <NavigationMenu.List className="flex items-center gap-0.5">
                {nav && (
                  <NavigationMenu.Item value="talent" className="relative">
                    <NavigationMenu.Trigger
                      onMouseEnter={() => setHover('talent')}
                      className={cn(linkCls, 'group/trig', talentActive || menu ? 'text-fg' : 'text-fg-muted hover:text-fg')}
                      aria-current={talentActive ? 'page' : undefined}
                    >
                      Talent
                      <ChevronDown className="size-3.5 transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-data-[state=open]/trig:rotate-180" aria-hidden />
                    </NavigationMenu.Trigger>
                    {pillOn('talent', talentActive) && <Pill />}
                    <NavigationMenu.Content className="data-[motion=from-end]:animate-[pop-in_220ms_var(--ease-out-expo)] data-[motion=from-start]:animate-[pop-in_220ms_var(--ease-out-expo)]">
                      <TalentMegaMenu nav={nav} />
                    </NavigationMenu.Content>
                  </NavigationMenu.Item>
                )}
                {(nav ? others : NAV_LINKS).map((l) => {
                  const active = isActive(l.href);
                  return (
                    <NavigationMenu.Item key={l.href} className="relative">
                      <NavigationMenu.Link asChild active={active}>
                        <Link
                          href={l.href}
                          onMouseEnter={() => setHover(l.href)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(linkCls, active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
                        >
                          {l.label}
                        </Link>
                      </NavigationMenu.Link>
                      {pillOn(l.href, active) && !menu && <Pill />}
                    </NavigationMenu.Item>
                  );
                })}
              </NavigationMenu.List>

              <div className="absolute top-full left-1/2 z-50 -translate-x-1/2 pt-3">
                <NavigationMenu.Viewport className="pop overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-float" />
              </div>
            </NavigationMenu.Root>
          )}

          <div className="relative ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            {/* Below 400px the mobile menu carries search, leaving room for the full wordmark. */}
            <span className={variant === 'full' ? 'hidden min-[400px]:contents' : 'contents'}>
              <SearchButton />
            </span>
            <span className="hidden sm:contents">
              <ThemeToggle />
            </span>
            <AccountMenu />
            {variant === 'full' && (
              <Magnetic className="ml-1 hidden md:inline-flex lg:hidden xl:inline-flex">
                <Button asChild size="md" className="h-10 md:h-11">
                  <Link href="/enquire">
                    Plan with an expert <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              </Magnetic>
            )}
            {variant === 'full' && <MobileMenu nav={nav} />}
          </div>
        </div>
      </div>

      {/* Refraction map for .liquid-glass (Chromium backdrop-filter: url()). */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id="liquid-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </motion.header>
    {/* Dim the page behind an open mega menu (outside the transformed header so it covers the viewport) */}
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 bg-black/40"
      initial={false}
      animate={{ opacity: menu ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    />
    </>
  );
}

function Pill() {
  return (
    <motion.span
      layoutId="nav-pill"
      aria-hidden
      className="absolute inset-0 rounded-full bg-[color-mix(in_oklab,var(--fg)_7%,transparent)] shadow-[inset_0_1px_0_0_var(--lg-rim),inset_0_-1px_0_0_var(--lg-edge-b)]"
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
    />
  );
}
