'use client';

import { Drawer } from 'vaul';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useScrollLock } from '@/lib/motion';
import { FilterPanel } from './filter-panel';
import type { Filters } from './query';

/** Mobile bottom sheet: drag with spring snap points (60% / full). */
export function MobileFilterSheet({
  filters,
  set,
  locked,
  activeCount,
  total,
  onClear,
}: {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  locked: Filters;
  activeCount: number;
  total: number | undefined;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(0.6);
  useScrollLock(open);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} snapPoints={[0.6, 1]} activeSnapPoint={snap} setActiveSnapPoint={setSnap}>
      <Drawer.Trigger className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-bg active:scale-[0.97]">
        <SlidersHorizontal className="size-4" aria-hidden /> Filters
        {activeCount > 0 && <span className="tabular grid size-5 place-items-center rounded-full bg-bg text-[0.6875rem] text-fg">{activeCount}</span>}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[91] flex h-full max-h-[96%] flex-col rounded-t-3xl border-t border-border bg-bg-elevated outline-none" aria-describedby={undefined}>
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border-strong" aria-hidden />
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <Drawer.Title className="font-display text-2xl font-extrabold tracking-tight">Filters</Drawer.Title>
            {activeCount > 0 && (
              <button type="button" onClick={onClear} className="text-sm font-medium text-fg-muted underline-offset-4 hover:underline">Clear all</button>
            )}
          </div>
          <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 pb-4" style={{ overscrollBehavior: 'contain' }}>
            <FilterPanel filters={filters} set={set} locked={locked} />
          </div>
          <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setOpen(false)} className="tabular h-12 w-full rounded-full bg-brand-gradient font-semibold text-primary-fg active:scale-[0.98]">
              {total === undefined ? 'Show results' : `Show ${total} ${total === 1 ? 'result' : 'results'}`}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
