'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@repo/ui/lib/cn';
import { formatDateShort } from '@repo/utils';

export type DashNavItem = { key: string; label: string; icon: LucideIcon; active: boolean; count?: number } & ({ href: string } | { onSelect: () => void });

/**
 * Shared dashboard frame for customers and talent: a sticky sidebar on large screens (who is
 * signed in, sections, a help card) and a scrollable row of section pills on phones.
 */
export function DashboardShell({ name, caption, nav, footer, children }: { name: string; caption: string; nav: DashNavItem[]; footer?: ReactNode; children: ReactNode }) {
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-12">
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <div className="hidden items-center gap-3 rounded-2xl border border-border bg-surface p-4 lg:flex">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-primary-fg">{initials}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{name}</span>
            <span className="block truncate text-xs text-fg-muted">{caption}</span>
          </span>
        </div>

        <nav aria-label="Dashboard" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:mt-3 lg:overflow-visible lg:px-0">
          <ul className="flex gap-2 lg:flex-col lg:gap-1">
            {nav.map((item) => {
              const cls = cn(
                'flex h-10 w-full items-center gap-3 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors lg:h-11 lg:rounded-xl lg:border-transparent lg:px-3',
                item.active ? 'border-transparent bg-fg text-bg lg:bg-surface-2 lg:text-fg' : 'border-border text-fg-muted hover:text-fg lg:hover:bg-surface',
              );
              const inner = (
                <>
                  <item.icon className={cn('size-4 shrink-0', item.active && 'lg:text-primary-text')} aria-hidden />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count != null && item.count > 0 && <span className="tabular rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-fg">{item.count}</span>}
                </>
              );
              return (
                <li key={item.key} className="shrink-0 lg:shrink">
                  {'href' in item ? (
                    <Link href={item.href} aria-current={item.active ? 'page' : undefined} className={cls}>{inner}</Link>
                  ) : (
                    <button type="button" onClick={item.onSelect} aria-current={item.active ? 'page' : undefined} className={cls}>{inner}</button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {footer && <div className="mt-6 hidden lg:block">{footer}</div>}
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Page title row used inside the shell. */
export function DashHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-h1 font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Small KPI card. */
export function StatCard({ icon: Icon, label, value, hint, tone = 'default' }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'warning' | 'success' }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-fg-muted">{label}</span>
        <span
          aria-hidden
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg',
            tone === 'warning' ? 'bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-warning' : tone === 'success' ? 'bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success' : 'bg-surface-2 text-primary-text',
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="tabular mt-3 font-display text-2xl font-extrabold tracking-tight break-words sm:text-3xl">{value}</div>
      {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

/** Help card for the sidebar. */
export function HelpCard({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-fg-muted">{body}</p>
      <div className="mt-3">{action}</div>
    </div>
  );
}

/** Calendar-style date tile: "13 / NOV". */
export function DateBlock({ date, muted = false }: { date: string; muted?: boolean }) {
  const [day, month] = formatDateShort(date).split(' ');
  return (
    <span className={cn('grid size-14 shrink-0 place-content-center rounded-xl border text-center', muted ? 'border-border text-fg-muted' : 'border-border-strong bg-bg-elevated')}>
      <span className="tabular font-display text-xl leading-none font-extrabold">{day}</span>
      <span className="mt-1 text-[0.625rem] font-semibold tracking-wider uppercase">{month}</span>
    </span>
  );
}
