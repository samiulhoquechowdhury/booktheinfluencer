'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@repo/ui/lib/cn';
import { Magnetic } from '@/lib/motion';

type Action = { href: string; label: string; shortLabel?: string };

/**
 * Closing call-to-action banner: brand gradient, isometric cube pattern and floating glass cubes.
 * Buttons sit side by side on phones.
 */
export function CtaBanner({
  title,
  body,
  primary,
  secondary,
  className,
}: {
  title: string;
  body: string;
  primary: Action;
  secondary?: Action;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl bg-brand-gradient p-8 text-primary-fg md:p-12', className)}>
      <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-white/15 blur-3xl" />
      {/* Isometric cube pattern, fading in from the right. */}
      <div aria-hidden className="absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]" style={{ backgroundImage: CUBE_TILE, backgroundSize: '60px 104px' }} />
      {/* Floating 3D cubes. Phones: one in the corner. Desktop: three between copy and buttons. */}
      <Cube size={44} className="-top-2 -right-2 opacity-70 md:top-[18%] md:right-[39%] md:opacity-100" duration={22} />
      <Cube size={30} className="right-[47%] bottom-[14%] hidden md:block" duration={16} reverse />
      <Cube size={20} className="top-[12%] right-[50%] hidden lg:block" duration={12} />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="md:max-w-[45%]">
          <p className="font-display text-h1 font-extrabold">{title}</p>
          <p className="mt-2 max-w-lg text-white/80">{body}</p>
        </div>
        <div className={cn('grid gap-3 sm:flex', secondary && 'grid-cols-2')}>
          <Magnetic className="flex">
            <Link href={primary.href} className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold whitespace-nowrap text-black transition-transform active:scale-[0.97] sm:h-14 sm:px-7 sm:text-base">
              <span className="sm:hidden">{primary.shortLabel ?? primary.label}</span>
              <span className="hidden sm:inline">{primary.label}</span>
              <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
            </Link>
          </Magnetic>
          {secondary && (
            <Link href={secondary.href} className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/10 sm:h-14 sm:px-7 sm:text-base">
              <span className="sm:hidden">{secondary.shortLabel ?? secondary.label}</span>
              <span className="hidden sm:inline">{secondary.label}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Seamless isometric cube tile (60×104): three shaded faces per cube, in translucent white. */
const CUBE = (x: number, y: number) =>
  `<g transform='translate(${x} ${y})' stroke='white' stroke-opacity='.22' stroke-width='.8'>` +
  `<path d='M30 0 60 17.32 30 34.64 0 17.32Z' fill='white' fill-opacity='.14'/>` +
  `<path d='M0 17.32 30 34.64 30 69.28 0 51.96Z' fill='white' fill-opacity='.05'/>` +
  `<path d='M30 34.64 60 17.32 60 51.96 30 69.28Z' fill='white' fill-opacity='.09'/></g>`;
const CUBE_TILE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='104'>${[[0, 0], [30, 52], [-30, 52], [30, -52], [-30, -52]].map(([x, y]) => CUBE(x!, y!)).join('')}</svg>`,
)}")`;

/** A slowly tumbling glass cube (CSS 3D). Static when reduced motion is on (global rule). */
function Cube({ size, className, duration, reverse }: { size: number; className?: string; duration: number; reverse?: boolean }) {
  const faces = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
  return (
    <div aria-hidden className={cn('pointer-events-none absolute [perspective:600px]', className)} style={{ width: size, height: size }}>
      <div
        className="relative size-full [transform-style:preserve-3d] motion-safe:animate-[cube-spin_var(--d)_linear_infinite]"
        style={{ '--d': `${duration}s`, animationDirection: reverse ? 'reverse' : undefined, transform: 'rotateX(-24deg) rotateY(36deg)' } as CSSProperties}
      >
        {faces.map((f) => (
          <span
            key={f}
            className="absolute inset-0 rounded-[10%] border border-white/50 bg-white/[0.12] shadow-[inset_0_0_18px_rgb(255_255_255/0.3)] [backface-visibility:visible]"
            style={{ transform: `${f} translateZ(${size / 2}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
