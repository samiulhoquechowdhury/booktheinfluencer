'use client';

import { Accordion as A } from 'radix-ui';
import { Plus } from 'lucide-react';
import { cn } from './lib/cn';

/** FAQ accordion. Height animates via Radix CSS var (see keyframes below). */
export function Accordion({
  items,
  className,
  numbered = false,
}: {
  items: readonly { q: string; a: React.ReactNode }[];
  className?: string;
  numbered?: boolean;
}) {
  return (
    <A.Root type="single" collapsible className={cn('divide-y divide-border border-y border-border', className)}>
      {items.map((it, i) => (
        <A.Item key={it.q} value={`i${i}`} className="group">
          <A.Header>
            <A.Trigger className="flex w-full items-center gap-4 py-6 text-left sm:gap-6 sm:py-7">
              {numbered && (
                <span className="tabular w-8 shrink-0 font-display text-sm font-bold text-fg-subtle">
                  {String(i + 1).padStart(2, '0')}
                </span>
              )}
              <span className="flex-1 font-display text-lg font-bold tracking-tight sm:text-2xl">{it.q}</span>
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border transition-[transform,background-color] duration-(--duration-slow) ease-(--ease-out-expo) group-data-[state=open]:rotate-45 group-data-[state=open]:bg-fg group-data-[state=open]:text-bg">
                <Plus className="size-4" aria-hidden />
              </span>
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden data-[state=closed]:animate-[acc-up_300ms_var(--ease-out-expo)] data-[state=open]:animate-[acc-down_400ms_var(--ease-out-expo)]">
            <div className={cn('max-w-3xl pb-7 text-fg-muted', numbered && 'sm:pl-14')}>{it.a}</div>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
