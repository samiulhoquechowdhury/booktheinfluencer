'use client';

import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type PointerEvent } from 'react';
import { cn } from './lib/cn';

/**
 * Button: fill sweeps in from (and out through) the side the pointer crosses; press scale 0.97.
 * Transform-only animation. Wrap in <Magnetic> (apps/web/lib/motion) for magnetic pull.
 */
const buttonVariants = cva(
  'group/btn relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-semibold transition-[transform,color,background-color,border-color] duration-(--duration-base) ease-(--ease-out-expo) active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand-gradient text-primary-fg hover:text-bg shadow-[0_12px_32px_-14px_var(--glow-1)]',
        secondary: 'border border-border-strong bg-surface text-fg hover:text-bg',
        outline: 'border border-border-strong text-fg hover:text-bg',
        glass: 'glass text-fg hover:text-bg',
        gold: 'bg-gold text-bg hover:text-bg',
        ghost: 'text-fg hover:bg-surface-2',
        link: 'h-auto! px-0! text-primary-text underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 rounded-full px-4 text-sm',
        md: 'h-11 rounded-full px-5 text-[0.9375rem]',
        lg: 'h-14 rounded-full px-7 text-base',
        xl: 'h-16 rounded-full px-9 text-lg',
        icon: 'size-11 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

const SWEEP_VARIANTS = new Set(['primary', 'secondary', 'outline', 'glass', 'gold']);

function sideOffset(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  const d = { left: x, right: 1 - x, top: y, bottom: 1 - y };
  const side = (Object.keys(d) as (keyof typeof d)[]).reduce((a, b) => (d[a] < d[b] ? a : b));
  return { left: ['-101%', '0'], right: ['101%', '0'], top: ['0', '-101%'], bottom: ['0', '101%'] }[side];
}

function setSweep(e: PointerEvent<HTMLElement>) {
  const [sx, sy] = sideOffset(e);
  e.currentTarget.style.setProperty('--sx', sx!);
  e.currentTarget.style.setProperty('--sy', sy!);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size, asChild, children, onPointerEnter, onPointerLeave, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  const sweep = SWEEP_VARIANTS.has(variant ?? 'primary');

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      onPointerEnter={(e: PointerEvent<HTMLButtonElement>) => {
        if (sweep && e.pointerType === 'mouse') setSweep(e);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => {
        if (sweep && e.pointerType === 'mouse') setSweep(e);
        onPointerLeave?.(e);
      }}
      {...props}
    >
      {sweep && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-fg [transform:translate(var(--sx,-101%),var(--sy,0))] transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/btn:[transform:translate(0,0)] group-focus-visible/btn:[transform:translate(0,0)]"
        />
      )}
      <Slot.Slottable>{children}</Slot.Slottable>
    </Comp>
  );
});

export { buttonVariants };
