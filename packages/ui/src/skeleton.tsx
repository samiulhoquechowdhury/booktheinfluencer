import { cn } from './lib/cn';

/** Shimmering placeholder. Transform-only shimmer; static under reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden rounded-md bg-surface-2', className)}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--fg)_6%,transparent)] to-transparent motion-safe:animate-shimmer" />
    </div>
  );
}
