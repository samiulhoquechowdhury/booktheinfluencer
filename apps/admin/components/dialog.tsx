'use client';

import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/** Small modal for quick forms (record a payment, schedule a payout…). */
export function Dialog({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <D.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elevated p-6 shadow-float">
          <D.Close aria-label="Close" className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X className="size-4" />
          </D.Close>
          <D.Title className="font-display text-xl font-extrabold tracking-tight">{title}</D.Title>
          {description ? <D.Description className="mt-1 text-sm text-fg-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          <div className="mt-5">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const fieldCls = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary-text';
