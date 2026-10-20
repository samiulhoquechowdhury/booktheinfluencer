'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { KanbanSquare, Search, Table2 } from 'lucide-react';
import { LEAD_STAGES, type LeadStage } from '@repo/schemas';
import { AvailabilityPill } from '@repo/ui/availability-pill';
import { Select } from '@repo/ui/select';
import { Skeleton } from '@repo/ui/skeleton';
import { EVENT_TYPE_LABELS } from '@repo/utils';
import { api, type Page } from '@/lib/api/client';
import { day, rupeesRange, titleCase } from '@/lib/format';
import { STAGE_NAMES } from '@/lib/roles';
import type { BoardColumn, LeadCard } from '@/lib/types';
import { ErrorNote, PageHeader } from './ui';
import { useUser } from './user-context';

const eventLabel = (t: string) => EVENT_TYPE_LABELS[t as keyof typeof EVENT_TYPE_LABELS] ?? titleCase(t);
const TERMINAL: LeadStage[] = ['CLOSED', 'LOST', 'CANCELLED'];

/** PIPE-2: Kanban board and table, filters in the URL so views can be shared. */
export function Pipeline() {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const view = sp.get('view') === 'table' ? 'table' : 'board';
  const stage = (LEAD_STAGES as readonly string[]).includes(sp.get('stage') ?? '') ? (sp.get('stage') as LeadStage) : undefined;
  const mine = sp.get('mine') === '1';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const [q, setQ] = useState(sp.get('q') ?? '');

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  // Debounced search into the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get('q') ?? '') !== q.trim()) set({ q: q.trim() || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filters = { q: sp.get('q') ?? undefined, ownerId: mine ? user.id : undefined };
  const board = useQuery({ queryKey: ['board', filters], queryFn: () => api.get<BoardColumn[]>('/admin/pipeline/board', filters), enabled: view === 'board', placeholderData: keepPreviousData });
  const table = useQuery({ queryKey: ['leads', filters, stage, page], queryFn: () => api.get<Page<LeadCard>>('/admin/leads', { ...filters, stage, page, pageSize: 25 }), enabled: view === 'table', placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader
        title="Pipeline"
        actions={
          <div className="flex rounded-full border border-border p-1" role="group" aria-label="View">
            {(
              [
                ['board', 'Board', KanbanSquare],
                ['table', 'Table', Table2],
              ] as const
            ).map(([v, label, Icon]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => set({ view: v === 'board' ? undefined : v })} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${view === v ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg'}`}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ref, customer, company, talent" className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm outline-none focus:border-primary-text" />
        </label>
        {view === 'table' && (
          <Select className="w-full sm:w-56" aria-label="Stage" value={stage ?? ''} onValueChange={(v) => set({ stage: v || undefined })} emptyLabel="All stages" options={LEAD_STAGES.map((s) => ({ value: s, label: STAGE_NAMES[s] }))} />
        )}
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={mine} onChange={(e) => set({ mine: e.target.checked ? '1' : undefined })} className="size-4 accent-[var(--primary)]" /> My leads
        </label>
      </div>

      {view === 'board' ? (
        board.isError ? (
          <ErrorNote error={board.error} onRetry={() => board.refetch()} />
        ) : !board.data ? (
          <div className="flex gap-3 overflow-hidden">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-2xl" />)}</div>
        ) : (
          <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8">
            {board.data
              .filter((c) => !TERMINAL.includes(c.stage) || c.count > 0)
              .map((c) => (
                <section key={c.stage} className="flex w-72 shrink-0 snap-start flex-col rounded-2xl border border-border bg-surface" aria-label={STAGE_NAMES[c.stage]}>
                  <header className="flex items-center justify-between px-3 pt-3 pb-2">
                    <h2 className="text-sm font-semibold">{STAGE_NAMES[c.stage]}</h2>
                    <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">{c.count}</span>
                  </header>
                  <ol className="grid gap-2 px-2 pb-2">
                    {c.cards.map((l) => (
                      <li key={l.id}>
                        <LeadCardView lead={l} />
                      </li>
                    ))}
                    {c.count > c.cards.length && (
                      <li>
                        <button type="button" onClick={() => set({ view: 'table', stage: c.stage })} className="w-full rounded-lg py-2 text-xs font-medium text-fg-muted hover:bg-surface-2 hover:text-fg">
                          See all {c.count}
                        </button>
                      </li>
                    )}
                  </ol>
                </section>
              ))}
          </div>
        )
      ) : table.isError ? (
        <ErrorNote error={table.error} onRetry={() => table.refetch()} />
      ) : !table.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <LeadTable page={table.data} onPage={(p) => set({ page: String(p) })} />
      )}
    </>
  );
}

function LeadCardView({ lead: l }: { lead: LeadCard }) {
  return (
    <Link href={`/leads/${l.id}`} className="block rounded-xl border border-border bg-bg-elevated p-3 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
        <span className="font-mono">{l.ref}</span>
        <span>{day(l.eventDate)}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold">{l.company ?? l.customer ?? 'Customer'}</p>
      <p className="truncate text-xs text-fg-muted">
        {eventLabel(l.eventType)} · {titleCase(l.city)}
      </p>
      {l.talents.length > 0 && (
        <ul className="mt-2 grid gap-1">
          {l.talents.slice(0, 3).map((t) => (
            <li key={t.name} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{t.name}</span>
              <AvailabilityPill status={t.availability} size="sm" />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-fg-subtle">{l.owner?.name ?? 'Unassigned'}</p>
    </Link>
  );
}

function LeadTable({ page, onPage }: { page: Page<LeadCard>; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  if (!page.items.length) return <p className="rounded-2xl border border-border p-8 text-center text-sm text-fg-muted">No leads match these filters.</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-surface text-left text-xs text-fg-muted">
            <tr>
              {['Ref', 'Customer', 'Event', 'Date', 'Talent', 'Budget', 'Stage', 'Owner'].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {page.items.map((l) => (
              <tr key={l.id} className="hover:bg-surface">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/leads/${l.id}`} className="font-medium text-primary-text hover:underline">
                    {l.ref}
                  </Link>
                </td>
                <td className="px-4 py-3">{l.company ?? l.customer ?? '—'}</td>
                <td className="px-4 py-3">
                  {eventLabel(l.eventType)} · {titleCase(l.city)}
                </td>
                <td className="tnum px-4 py-3 whitespace-nowrap">{day(l.eventDate)}</td>
                <td className="px-4 py-3">{l.talents.map((t) => t.name).join(', ') || '—'}</td>
                <td className="tnum px-4 py-3 whitespace-nowrap">{rupeesRange(l.budget)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{STAGE_NAMES[l.stage]}</td>
                <td className="px-4 py-3">{l.owner?.name ?? 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
        <span className="tnum">
          {page.total} lead{page.total === 1 ? '' : 's'} · page {page.page} of {pages}
        </span>
        <div className="flex gap-2">
          <button type="button" disabled={page.page <= 1} onClick={() => onPage(page.page - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <button type="button" disabled={page.page >= pages} onClick={() => onPage(page.page + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
