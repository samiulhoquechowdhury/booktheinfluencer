import type { ReactNode } from 'react';
import { cn } from './lib/cn';

type Art = 'search' | 'calendar' | 'heart' | 'inbox' | 'error';

/** Small looping CSS/SVG illustrations (no Lottie). Static under reduced motion. */
function Illustration({ art }: { art: Art }) {
  return (
    <div aria-hidden className="relative mx-auto mb-6 grid size-28 place-items-center">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_70%)]" />
      <div className="absolute inset-2 rounded-full border border-dashed border-border-strong motion-safe:animate-spin-slow" />
      <svg viewBox="0 0 64 64" className="relative size-14 text-fg motion-safe:animate-float" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {art === 'search' && (<><circle cx="28" cy="28" r="14" /><path d="m39 39 12 12" /><path d="M22 28h12" className="text-accent" stroke="var(--accent)" /></>)}
        {art === 'calendar' && (<><rect x="12" y="16" width="40" height="36" rx="6" /><path d="M12 26h40M22 10v10M42 10v10" /><circle cx="32" cy="39" r="4" fill="var(--accent)" stroke="none" /></>)}
        {art === 'heart' && (<path d="M32 50S12 38 12 24a10 10 0 0 1 20-3 10 10 0 0 1 20 3c0 14-20 26-20 26Z" stroke="var(--accent)" />)}
        {art === 'inbox' && (<><path d="M10 36 18 14h28l8 22v12a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4Z" /><path d="M10 36h14l4 6h8l4-6h14" stroke="var(--accent)" /></>)}
        {art === 'error' && (<><path d="M32 10 56 52H8Z" /><path d="M32 26v12" stroke="var(--accent)" /><circle cx="32" cy="45" r="1.5" fill="currentColor" /></>)}
      </svg>
    </div>
  );
}

export function EmptyState({
  art = 'inbox',
  title,
  description,
  action,
  className,
}: {
  art?: Art;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-md px-4 py-16 text-center', className)}>
      <Illustration art={art} />
      <h3 className="font-display text-2xl font-extrabold tracking-tight">{title}</h3>
      {description && <p className="mt-2 text-fg-muted">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
