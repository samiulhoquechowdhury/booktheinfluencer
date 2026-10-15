import type { ReactNode } from 'react';
import { cn } from './lib/cn';

/** Oversized section number + eyebrow + headline. */
export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  as: Tag = 'h2',
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <header className={cn('max-w-4xl', align === 'center' && 'mx-auto text-center', className)}>
      {(index || eyebrow) && (
        <p className={cn('mb-5 flex items-center gap-3', align === 'center' && 'justify-center')}>
          {index && <span className="tabular font-display text-sm font-bold text-primary-text">{index}</span>}
          {index && eyebrow && <span aria-hidden className="h-px w-8 bg-border-strong" />}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        </p>
      )}
      <Tag className="font-display text-display font-extrabold">{title}</Tag>
      {description && <p className="mt-5 max-w-2xl text-lg text-fg-muted">{description}</p>}
    </header>
  );
}
