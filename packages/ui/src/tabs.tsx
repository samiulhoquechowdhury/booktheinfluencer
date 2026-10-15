'use client';

import { Tabs as T } from 'radix-ui';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from './lib/cn';

/** Tabs with a shared-layout active indicator. */
export function Tabs({
  value,
  onValueChange,
  items,
  children,
  className,
  layoutId = 'tab-indicator',
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: readonly { value: string; label: string; count?: number }[];
  children: React.ReactNode;
  className?: string;
  layoutId?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <T.Root value={value} onValueChange={onValueChange} className={className}>
      <T.List className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        {items.map((it) => (
          <T.Trigger
            key={it.value}
            value={it.value}
            className="relative shrink-0 px-3 py-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:text-fg"
          >
            {it.label}
            {it.count != null && (
              <span className="tabular ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.6875rem]">{it.count}</span>
            )}
            {value === it.value && (
              <motion.span
                layoutId={reduce ? undefined : layoutId}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-gradient"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
          </T.Trigger>
        ))}
      </T.List>
      {children}
    </T.Root>
  );
}

export const TabPanel = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => (
  <T.Content value={value} className={cn('pt-6 outline-none', className)}>
    {children}
  </T.Content>
);
