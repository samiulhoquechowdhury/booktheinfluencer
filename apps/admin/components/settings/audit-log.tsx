'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Skeleton } from '@repo/ui/skeleton';
import { api, type Page } from '@/lib/api/client';
import { when } from '@/lib/format';
import type { AuditRow, UserRow } from '@/lib/types';
import { useUrlState } from '../money/use-url-state';
import { ErrorNote, PageHeader } from '../ui';

const ENTITIES = ['lead', 'booking', 'quote', 'milestone', 'payout', 'contract', 'talent', 'rep', 'category', 'user', 'invite'];

/** AUD-1..3: who changed what, when, from where. Secrets are redacted before they're stored. */
export function AuditLog() {
  const { sp, set, page } = useUrlState();
  const entity = sp.get('entity') ?? undefined;
  const entityId = sp.get('entityId') ?? undefined;
  const actorId = sp.get('actorId') ?? undefined;
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['audit', entity, entityId, actorId, page],
    queryFn: () => api.get<Page<AuditRow>>('/admin/audit', { entity, entityId, actorId, page, pageSize: 50 }),
    placeholderData: keepPreviousData,
  });
  // Names for actor ids (staff lists are small).
  const users = useQuery({ queryKey: ['users', 'all'], queryFn: () => api.get<Page<UserRow>>('/admin/users', { pageSize: 100 }), staleTime: 300_000 });
  const who = (id: string | null) => (id ? (users.data?.items.find((u) => u.id === id)?.name ?? `${id.slice(0, 8)}…`) : 'System');
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Audit log" description="Every change to bookings, quotes, payments, payouts, rate cards and roles." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {['all', ...ENTITIES].map((e) => (
          <button key={e} type="button" aria-pressed={(entity ?? 'all') === e} onClick={() => set({ entity: e === 'all' ? undefined : e, entityId: undefined })} className={`rounded-full border px-3 py-1 text-sm ${(entity ?? 'all') === e ? 'border-primary-text bg-surface-2' : 'border-border text-fg-muted hover:text-fg'}`}>
            {e}
          </button>
        ))}
        {(entityId || actorId) && (
          <button type="button" onClick={() => set({ entityId: undefined, actorId: undefined })} className="rounded-full border border-border px-3 py-1 text-sm text-fg-muted hover:text-fg">
            {entityId ? `record ${entityId.slice(0, 8)}…` : `by ${who(actorId!)}`} ✕
          </button>
        )}
      </div>
      {q.isError ? (
        <ErrorNote error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !q.data.items.length ? (
        <p className="rounded-2xl border border-border p-8 text-center text-sm text-fg-muted">No entries.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <ol className="divide-y divide-border">
            {q.data.items.map((a) => (
              <li key={a.id} className="text-sm">
                <button type="button" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)} className="grid w-full gap-1 px-4 py-3 text-left hover:bg-surface sm:grid-cols-[10rem_12rem_1fr_auto] sm:items-center">
                  <span className="tnum text-fg-muted">{when(a.createdAt)}</span>
                  <span className="truncate font-medium">{who(a.actorId)}</span>
                  <span className="min-w-0 truncate font-mono text-xs">{a.action}</span>
                  <span className="text-xs text-fg-subtle">{a.entity}</span>
                </button>
                {open === a.id && (
                  <div className="grid gap-3 bg-surface px-4 pb-4 sm:grid-cols-2">
                    <div className="flex flex-wrap gap-3 text-xs sm:col-span-2">
                      <button type="button" className="text-primary-text hover:underline" onClick={() => set({ entity: a.entity, entityId: a.entityId })}>
                        History of this {a.entity}
                      </button>
                      {a.actorId && (
                        <button type="button" className="text-primary-text hover:underline" onClick={() => set({ actorId: a.actorId!, entity: undefined, entityId: undefined })}>
                          Everything by {who(a.actorId)}
                        </button>
                      )}
                      {a.ip && <span className="text-fg-subtle">IP {a.ip}</span>}
                    </div>
                    {(['before', 'after'] as const).map((k) => (
                      <div key={k} className="min-w-0">
                        <p className="mb-1 text-xs text-fg-muted">{k}</p>
                        <pre className="max-h-64 overflow-auto rounded-lg bg-bg p-3 text-xs">{a[k] == null ? '—' : JSON.stringify(a[k], null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
            <span className="tnum">
              {q.data.total} entries · page {q.data.page} of {pages}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
                Previous
              </button>
              <button type="button" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
