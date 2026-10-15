'use client';

import { Slider } from 'radix-ui';
import { formatINRShort, rupeesToPaise } from '@repo/utils';

const MAX = 5_000_000;
const STEP = 25_000;

/** Dual-thumb budget range in whole rupees (display via formatINRShort). */
export function BudgetSlider({ value, onChange }: { value: [number, number]; onChange: (v: [number, number]) => void }) {
  const fmt = (r: number) => (r >= MAX ? `${formatINRShort(rupeesToPaise(MAX))}+` : formatINRShort(rupeesToPaise(r)));
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase" id="budget-label">Budget for talent (indicative)</span>
        <span className="tabular font-display text-2xl font-extrabold tracking-tight" aria-live="polite">
          {fmt(value[0])} – {fmt(value[1])}
        </span>
      </div>
      <Slider.Root
        className="relative flex h-6 touch-none items-center select-none"
        min={0}
        max={MAX}
        step={STEP}
        minStepsBetweenThumbs={1}
        value={value}
        onValueChange={(v) => onChange([v[0] ?? 0, v[1] ?? MAX])}
        aria-labelledby="budget-label"
      >
        <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3">
          <Slider.Range className="absolute h-full bg-brand-gradient" />
        </Slider.Track>
        {(['Minimum budget', 'Maximum budget'] as const).map((l) => (
          <Slider.Thumb
            key={l}
            aria-label={l}
            className="block size-6 rounded-full border-2 border-bg bg-fg shadow-float transition-transform outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring/40 active:scale-95"
          />
        ))}
      </Slider.Root>
      <div className="tabular mt-2 flex justify-between text-xs text-fg-subtle">
        <span>₹0</span>
        <span>₹50L+</span>
      </div>
    </div>
  );
}
