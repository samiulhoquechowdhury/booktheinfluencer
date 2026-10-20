import type { ReactNode } from 'react';
import { cn } from '@repo/ui/lib/cn';

/** Small layout pieces shared by admin screens. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border border-border bg-bg-elevated p-5', className)}>{children}</section>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">{label}</p>
      <p className="tnum mt-2 font-display text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </Card>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm">
      <p className="font-medium text-danger">{error instanceof Error ? error.message : 'Couldn’t load this.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-medium underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-fg-muted">{label}</dt>
    <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
  </div>
);
