'use client';

import { Info } from 'lucide-react';
import { Tooltip } from 'radix-ui';
import { formatFeeBand } from '@repo/utils';
import type { FeeBand as FeeBandValue } from '@repo/schemas';
import { cn } from './lib/cn';

/** "₹2L – ₹4L · indicative" or "On request". Never a single fee (rules.md §0.6). */
export function FeeBand({
  band,
  size = 'md',
  withInfo = false,
  className,
}: {
  band: FeeBandValue | null;
  size?: 'sm' | 'md' | 'lg';
  withInfo?: boolean;
  className?: string;
}) {
  const { range, qualifier } = formatFeeBand(band);
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span
        className={cn(
          'tabular font-semibold text-fg',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'font-display text-2xl font-extrabold tracking-tight',
        )}
      >
        {range}
      </span>
      {qualifier && <span className="text-xs text-fg-muted">· {qualifier}</span>}
      {withInfo && (
        <Tooltip.Provider delayDuration={150}>
          <Tooltip.Root>
            <Tooltip.Trigger
              className="self-center rounded-full text-fg-subtle hover:text-fg"
              aria-label="What changes the final price"
            >
              <Info className="size-3.5" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={6}
                className="z-[80] max-w-64 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs leading-relaxed text-fg shadow-float"
              >
                Final price depends on date, city, set length, travel, accommodation and
                production. It’s confirmed with the authorised representative in your quote.
                <Tooltip.Arrow className="fill-bg-elevated" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </span>
  );
}
