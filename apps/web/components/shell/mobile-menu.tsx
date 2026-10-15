'use client';

import { Dialog } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { useScrollLock } from '@/lib/motion';
import { NAV_LINKS } from './nav-links';

/** Full-screen menu: circular clip reveal from the toggle, staggered oversized links. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useScrollLock(open);
  useEffect(() => setOpen(false), [pathname]);

  const links = [...NAV_LINKS, { href: '/faq', label: 'FAQ' }, { href: '/contact', label: 'Contact' }];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="relative z-[97] grid size-10 place-items-center rounded-full border border-border lg:hidden"
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
                className="fixed inset-0 z-[96] flex flex-col overflow-y-auto bg-bg pt-24 pb-10"
                initial={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2rem)' }}
                animate={{ clipPath: 'circle(150% at calc(100% - 2.5rem) 2rem)' }}
                exit={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2rem)' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
                <nav aria-label="Mobile" className="shell flex-1">
                  <ul className="space-y-1">
                    {links.map((l, i) => (
                      <li key={l.href} className="overflow-hidden">
                        <motion.div
                          initial={{ y: '110%' }}
                          animate={{ y: 0 }}
                          exit={{ y: '110%' }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.05 }}
                        >
                          <Link href={l.href} className="flex items-baseline gap-4 py-1 font-display text-[clamp(2.5rem,12vw,4.5rem)] leading-none font-extrabold tracking-[-0.04em]">
                            <span className="tabular text-sm font-bold text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                            {l.label}
                          </Link>
                        </motion.div>
                      </li>
                    ))}
                  </ul>
                </nav>
                <motion.div className="shell mt-10 space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }} exit={{ opacity: 0 }}>
                  <Link href="/enquire" className="flex h-14 items-center justify-center gap-2 rounded-full bg-brand-gradient font-semibold text-primary-fg">
                    Plan with an expert <ArrowUpRight className="size-5" aria-hidden />
                  </Link>
                  <p className="text-sm text-fg-muted">
                    Talk to a booking manager: <a className="text-fg underline-offset-4 hover:underline" href={`tel:${BRAND.supportPhone.replace(/\s/g, '')}`}>{BRAND.supportPhone}</a>
                  </p>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
