'use client';

import Link from 'next/link';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useState } from 'react';
import type { PublicTalent } from '@repo/schemas';
import { FeeBand } from '@repo/ui/fee-band';
import { ctaLabelForTier } from '@repo/utils';
import { enquireHref } from './booking-card';

/** Sticky mobile booking bar: hides on scroll down, shows on scroll up. */
export function MobileBookingBar({ talent }: { talent: PublicTalent }) {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y > prev + 4 && y > 400) setHidden(true);
    else if (y < prev - 4) setHidden(false);
  });
  return (
    <motion.div
      className="glass fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl p-3 pl-4 shadow-float lg:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      animate={{ y: hidden && !reduce ? '140%' : '0%' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="min-w-0">
        <FeeBand band={talent.feeBand} size="sm" />
        <p className="truncate text-xs text-fg-subtle">Confirmed with the representative</p>
      </div>
      <Link href={enquireHref(talent)} className="flex h-12 shrink-0 items-center rounded-full bg-brand-gradient px-5 text-sm font-semibold text-primary-fg active:scale-[0.97]">
        {ctaLabelForTier(talent.tier)}
      </Link>
    </motion.div>
  );
}
