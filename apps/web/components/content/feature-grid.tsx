import type { LucideIcon } from 'lucide-react';
import { cn } from '@repo/ui/lib/cn';
import { Reveal, RevealItem } from '@/lib/motion';

export type Feature = { icon: LucideIcon; title: string; body: string };

/** Icon cards with a quiet hover lift; used for "why us" style lists on content pages. */
export function FeatureGrid({ items, className }: { items: Feature[]; className?: string }) {
  return (
    <Reveal stagger as="ul" className={cn('grid gap-4 sm:grid-cols-2', items.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4', className)}>
      {items.map((f) => (
        <RevealItem as="li" key={f.title} className="h-full">
          <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated p-6 transition-[transform,border-color,box-shadow] duration-500 ease-(--ease-out-expo) hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_24px_48px_-28px_rgb(0_0_0/0.35)]">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary-text ring-1 ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]">
              <f.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-fg-muted">{f.body}</p>
          </article>
        </RevealItem>
      ))}
    </Reveal>
  );
}
