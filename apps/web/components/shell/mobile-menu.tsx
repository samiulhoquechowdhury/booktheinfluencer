'use client';

import { Dialog } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Mail, MessageCircle, Phone, Search, X } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@repo/ui/lib/cn';
import { BRAND } from '@/lib/brand';
import { useScrollLock } from '@/lib/motion';
import { NAV_LINKS } from './nav-links';
import type { NavData } from './nav-types';
import { useSearchPalette } from './search-palette';
import { ThemeToggle } from './theme-toggle';

const EASE = [0.16, 1, 0.3, 1] as const; // container reveal

/** Full-screen menu: circular reveal from the toggle, search, category tiles, staggered links. */
export function MobileMenu({ nav }: { nav?: NavData }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { open: openSearch } = useSearchPalette();
  useScrollLock(open);
  useEffect(() => setOpen(false), [pathname]);

  const links = [...NAV_LINKS, { href: '/faq', label: 'FAQ' }, { href: '/contact', label: 'Contact' }];
  const rise = (delay: number) => ({ className: 'rise-in', style: { animationDelay: `${delay}s` } });
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="relative grid size-11 place-items-center rounded-full border border-border bg-surface/50 transition-transform active:scale-90 lg:hidden"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <span className="relative block h-3 w-4">
          <motion.span className="absolute left-0 h-0.5 w-4 rounded-full bg-fg" animate={open ? { top: 5, rotate: 45 } : { top: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} />
          <motion.span className="absolute left-0 h-0.5 w-4 rounded-full bg-fg" animate={open ? { top: 5, rotate: -45 } : { top: 10, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} />
        </span>
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                data-lenis-prevent
                className="menu-reveal fixed inset-0 z-[96] flex flex-col overflow-x-clip overflow-y-auto bg-bg pt-24 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                style={{ overscrollBehavior: 'contain' }}
                initial={false}
                exit={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2rem)', transition: { duration: 0.45, ease: EASE } }}
              >
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                {/* Own top bar: the header's toggle sits under this full-screen layer */}
                <div className="shell absolute inset-x-0 top-2 z-10 md:top-3">
                  <div className="flex h-14 items-center justify-between pr-1.5 pl-4 md:h-16 md:pr-2 md:pl-6">
                    <Logo />
                    <Dialog.Close className="grid size-11 place-items-center rounded-full border border-border-strong bg-surface text-fg transition-transform active:scale-90" aria-label="Close menu">
                      <X className="size-5" strokeWidth={2.25} aria-hidden />
                    </Dialog.Close>
                  </div>
                </div>
                <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
                  <div className="absolute -top-40 -right-40 size-[28rem] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
                </div>

                <div className="shell relative flex flex-1 flex-col gap-8">
                  <div {...rise(0.1)}>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        setTimeout(openSearch, 250);
                      }}
                      className="flex h-12 w-full items-center gap-3 rounded-full border border-border bg-surface px-4 text-left text-fg-muted"
                    >
                      <Search className="size-4" aria-hidden /> Search talent, cities…
                    </button>
                  </div>

                  {nav && (
                    <section {...rise(0.16)} aria-labelledby="mm-browse">
                      <p id="mm-browse" className="eyebrow mb-3">Browse</p>
                      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
                        {nav.categories.map((c) => (
                          <li key={c.slug} className="w-32 shrink-0 snap-start sm:w-auto">
                            <Link href={`/talent/${c.slug}`} onClick={close} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
                              {c.image.src && (
                                <Image src={c.image.src} alt="" fill sizes="(min-width: 640px) 18vw, 128px" quality={60} placeholder={c.image.blurDataURL ? 'blur' : 'empty'} blurDataURL={c.image.blurDataURL} className="object-cover" />
                              )}
                              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                              <span className="absolute inset-x-3 bottom-3 text-white">
                                <span className="block font-display text-base leading-tight font-extrabold">{c.name}</span>
                                <span className="tabular text-[0.6875rem] text-white/70">{c.count} acts</span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <nav aria-label="Mobile" className="flex-1">
                    <ul className="border-t border-border">
                      {links.map((l, i) => {
                        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                        return (
                          <li key={l.href} className="border-b border-border">
                            <div className="rise-in" style={{ animationDelay: `${0.2 + i * 0.04}s` }}>
                              <Link
                                href={l.href}
                                onClick={close}
                                aria-current={active ? 'page' : undefined}
                                className={cn('group flex items-center gap-4 py-3.5 font-display text-[clamp(1.75rem,8vw,3rem)] leading-none font-extrabold tracking-[-0.035em]', active && 'text-gradient')}
                              >
                                <span className="tabular w-6 text-xs font-bold text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                                <span className="flex-1">{l.label}</span>
                                <ArrowUpRight className="size-6 text-fg-subtle transition-transform group-active:translate-x-1 group-active:-translate-y-1" aria-hidden />
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  <div className={`${rise(0.45).className} space-y-4`} style={rise(0.45).style}>
                    <Link href="/enquire" onClick={close} className="flex h-14 items-center justify-center gap-2 rounded-full bg-brand-gradient font-semibold text-primary-fg active:scale-[0.98]">
                      Plan with an expert <ArrowUpRight className="size-5" aria-hidden />
                    </Link>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-2">
                      <div className="flex gap-1">
                        {[
                          { icon: Phone, label: 'Call', href: `tel:${BRAND.supportPhone.replace(/\s/g, '')}` },
                          { icon: MessageCircle, label: 'WhatsApp', href: `https://wa.me/${BRAND.whatsapp}` },
                          { icon: Mail, label: 'Email', href: `mailto:${BRAND.email}` },
                        ].map((c) => (
                          <a key={c.label} href={c.href} aria-label={c.label} className="grid size-10 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg">
                            <c.icon className="size-[18px]" aria-hidden />
                          </a>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pr-1 text-xs text-fg-muted">
                        Theme <ThemeToggle />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
