'use client';

import { BadgeCheck } from 'lucide-react';
import { Tooltip } from 'radix-ui';
import { cn } from './lib/cn';

/** Gold tick. Rendered only when the data says verified (design.md §4, §7). */
export function VerifiedBadge({
  verified,
  size = 'md',
  withLabel = false,
  className,
}: {
  verified: boolean;
  size?: 'sm' | 'md' | 'lg';
  withLabel?: boolean;
  className?: string;
}) {
  if (!verified) return null;
  const icon = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' }[size];
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            tabIndex={0}
            className={cn(
              'inline-flex items-center gap-1 rounded-full text-gold-text outline-none focus-visible:ring-2 focus-visible:ring-ring',
              withLabel && 'bg-gold-soft px-2 py-0.5 text-xs font-semibold',
              className,
            )}
          >
            <BadgeCheck className={cn(icon, 'fill-gold-soft')} aria-hidden />
            {withLabel ? 'Verified' : <span className="sr-only">Verified representation</span>}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-[80] max-w-56 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs text-fg shadow-float"
          >
            Representation verified by our team
            <Tooltip.Arrow className="fill-bg-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
