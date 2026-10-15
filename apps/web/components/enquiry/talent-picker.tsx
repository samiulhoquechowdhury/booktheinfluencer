'use client';

import Image from 'next/image';
import { Popover } from 'radix-ui';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import type { PublicTalent } from '@repo/schemas';
import { FeeBand } from '@repo/ui/fee-band';
import { api } from '@/lib/api/client';
import { categorySingular, cityName } from '@/lib/reference';

/** Selected talent chips + "Add more" search popover (max 5). */
export function TalentPicker({ value, onChange }: { value: string[]; onChange: (slugs: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const selected = useQuery({
    queryKey: ['talents', 'by-slugs', value],
    queryFn: () => Promise.all(value.map((s) => api.talents.bySlug(s))),
    enabled: value.length > 0,
    placeholderData: (p) => p,
  });
  const results = useQuery({
    queryKey: ['talents', 'picker', debounced],
    queryFn: () => api.talents.list({ q: debounced || undefined, pageSize: 8 }),
    enabled: open,
  });

  const byslug = new Map((selected.data ?? []).map((t) => [t.slug, t]));
  const add = (t: PublicTalent) => {
    if (!value.includes(t.slug) && value.length < 5) onChange([...value, t.slug]);
    setOpen(false);
    setQ('');
  };

  return (
    <div>
      <p className="mb-3 text-xs font-semibold tracking-wide text-fg-muted uppercase" id="talent-picker-label">Preferred talent (optional)</p>
      <ul className="flex flex-wrap gap-2" aria-labelledby="talent-picker-label">
        <AnimatePresence mode="popLayout" initial={false}>
          {value.map((slug) => {
            const t = byslug.get(slug);
            return (
              <motion.li key={slug} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface py-1 pr-1 pl-1">
                  <span className="relative size-7 overflow-hidden rounded-full bg-surface-3">
                    {t && <Image src={t.images[0]!.src} alt="" fill sizes="28px" className="object-cover" />}
                  </span>
                  <span className="text-sm font-medium">{t?.name ?? slug}</span>
                  <button type="button" onClick={() => onChange(value.filter((s) => s !== slug))} aria-label={`Remove ${t?.name ?? slug}`} className="grid size-6 place-items-center rounded-full hover:bg-surface-3">
                    <X className="size-3.5" />
                  </button>
                </span>
              </motion.li>
            );
          })}
          <motion.li layout key="add">
            <Popover.Root open={open} onOpenChange={setOpen}>
              <Popover.Trigger disabled={value.length >= 5} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-4 text-sm font-medium text-fg-muted transition-colors hover:text-fg disabled:opacity-50">
                <Plus className="size-4" aria-hidden /> {value.length ? 'Add more' : 'Add talent'}
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="start" sideOffset={8} className="z-[95] w-[min(92vw,380px)] rounded-xl border border-border bg-bg-elevated p-2 shadow-float" data-lenis-prevent>
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, language, city…" aria-label="Search talent" className="h-11 w-full rounded-lg bg-surface pr-3 pl-9 text-sm outline-none" />
                  </div>
                  <ul className="max-h-72 overflow-y-auto" role="listbox" aria-label="Talent results">
                    {results.isLoading && <li className="flex justify-center p-4"><Loader2 className="size-4 animate-spin" aria-label="Loading" /></li>}
                    {results.data?.items.length === 0 && <li className="p-4 text-center text-sm text-fg-muted">No match — describe what you need in notes.</li>}
                    {results.data?.items.map((t) => (
                      <li key={t.slug} role="option" aria-selected={value.includes(t.slug)}>
                        <button type="button" onClick={() => add(t)} disabled={value.includes(t.slug)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2 disabled:opacity-50">
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                            <Image src={t.images[0]!.src} alt="" fill sizes="40px" className="object-cover" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{t.name}</span>
                            <span className="block truncate text-xs text-fg-muted">{categorySingular(t.primaryCategory)} · {cityName(t.baseCity)}</span>
                          </span>
                          <FeeBand band={t.feeBand} size="sm" className="shrink-0 [&>span:last-child]:hidden" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </motion.li>
        </AnimatePresence>
      </ul>
      <p className="mt-2 text-xs text-fg-subtle">No preference? Leave it empty — we’ll shortlist options that fit your brief.</p>
    </div>
  );
}
