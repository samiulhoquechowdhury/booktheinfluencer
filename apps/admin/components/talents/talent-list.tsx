'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Search, Star } from 'lucide-react';
import { buttonVariants } from '@repo/ui/button';
import { Select } from '@repo/ui/select';
import { Skeleton } from '@repo/ui/skeleton';
import { api, type Page } from '@/lib/api/client';
import { titleCase } from '@/lib/format';
import { mediaSrc } from '@/lib/media';
import { EDIT_CATALOGUE, can } from '@/lib/roles';
import type { AdminTalent, Category } from '@/lib/types';
import { ErrorNote, PageHeader } from '../ui';
import { useUser } from '../user-context';

export const STATUS_TONE: Record<AdminTalent['status'], string> = { DRAFT: 'bg-surface-2 text-fg-muted', PUBLISHED: 'bg-success/15 text-success', HIDDEN: 'bg-warning/15 text-warning' };
export const STATUS_LABEL: Record<AdminTalent['status'], string> = { DRAFT: 'Draft', PUBLISHED: 'Live', HIDDEN: 'Hidden' };

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/admin/categories'), staleTime: 300_000 });

/** ADM-1: every profile, with status and what's missing at a glance. */
export function TalentList() {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const status = sp.get('status') ?? undefined;
  const category = sp.get('category') ?? undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const [q, setQ] = useState(sp.get('q') ?? '');
  const cats = useCategories();

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  useEffect(() => {
    const t = setTimeout(() => (sp.get('q') ?? '') !== q.trim() && set({ q: q.trim() || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const list = useQuery({
    queryKey: ['talents', status, category, sp.get('q'), page],
    queryFn: () => api.get<Page<AdminTalent>>('/admin/talents', { status, category, q: sp.get('q'), page, pageSize: 25 }),
    placeholderData: keepPreviousData,
  });
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Talents"
        actions={
          can(user, ...EDIT_CATALOGUE) && (
            <Link href="/talents/new" className={buttonVariants({ size: 'sm' })}>
              <Plus aria-hidden /> New talent
            </Link>
          )
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search by name</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm outline-none focus:border-primary-text" />
        </label>
        <Select className="w-full sm:w-44" aria-label="Status" value={status ?? ''} onValueChange={(v) => set({ status: v || undefined })} emptyLabel="Any status" options={(['PUBLISHED', 'DRAFT', 'HIDDEN'] as const).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        <Select className="w-full sm:w-48" aria-label="Category" value={category ?? ''} onValueChange={(v) => set({ category: v || undefined })} emptyLabel="Any category" options={(cats.data ?? []).map((c) => ({ value: c.slug, label: c.name }))} />
      </div>
      {list.isError ? (
        <ErrorNote error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !list.data.items.length ? (
        <p className="rounded-2xl border border-border p-8 text-center text-sm text-fg-muted">No talent matches these filters.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="bg-surface text-left text-xs text-fg-muted">
                <tr>
                  {['Talent', 'Categories', 'Base city', 'Tier', 'Photos', 'Rate cards', 'Status'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.items.map((t) => {
                  const cover = t.media.find((m) => m.isCover) ?? t.media[0];
                  return (
                    <tr key={t.id} className="hover:bg-surface">
                      <td className="px-4 py-3">
                        <Link href={`/talents/${t.id}`} className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element -- preview from the website origin */}
                          {cover ? <img src={mediaSrc(cover.key)} alt="" className="size-10 shrink-0 rounded-lg bg-surface-2 object-cover" /> : <span className="size-10 shrink-0 rounded-lg bg-surface-2" />}
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-semibold text-fg hover:underline">
                              {t.stageName}
                              {t.featured && <Star className="size-3.5 fill-gold text-gold" aria-label="Featured" />}
                            </span>
                            <span className="block font-mono text-xs text-fg-subtle">{t.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">{t.categories.map((c) => cats.data?.find((x) => x.slug === c)?.name ?? titleCase(c)).join(', ')}</td>
                      <td className="px-4 py-3">{titleCase(t.baseCity)}</td>
                      <td className="px-4 py-3">{titleCase(t.tier)}</td>
                      <td className={`tnum px-4 py-3 ${t.media.length < 4 ? 'text-warning' : ''}`}>{t.media.length}</td>
                      <td className="tnum px-4 py-3">{t.counts.rateCards}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
            <span className="tnum">
              {list.data.total} talent · page {list.data.page} of {pages}
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
