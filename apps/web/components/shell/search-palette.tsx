'use client';

import { Dialog } from 'radix-ui';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, CornerDownLeft, Loader2, MapPin, Search, Sparkles } from 'lucide-react';
import { formatFeeBand } from '@repo/utils';
import { VerifiedBadge } from '@repo/ui/verified-badge';
import { cn } from '@repo/ui/lib/cn';
import { api } from '@/lib/api/client';
import { CATEGORIES, CITIES, categorySingular, cityName } from '@/lib/reference';
import { useScrollLock } from '@/lib/motion';

/** Global quick search (⌘K / Ctrl+K / "/"). One instance; anything can open it via context. */
const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useSearchPalette = () => useContext(Ctx);

type Row = { id: string; href: string; title: string; meta?: string; right?: ReactNode; icon?: ReactNode; image?: string; verified?: boolean };

export function SearchPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      <SearchPalette open={open} onOpenChange={setOpen} />
    </Ctx.Provider>
  );
}

function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!open) {
      setQ('');
      setDebounced('');
    }
  }, [open]);

  const results = useQuery({
    queryKey: ['talents', 'palette', debounced],
    queryFn: () => api.talents.list({ q: debounced, pageSize: 6 }),
    enabled: open && debounced.length > 0,
    placeholderData: (p) => p,
    staleTime: 60_000,
  });

  const groups: { label: string; rows: Row[] }[] = debounced
    ? [
        {
          label: 'Talent',
          rows: (results.data?.items ?? []).map((t) => ({
            id: `t-${t.slug}`,
            href: `/t/${t.slug}`,
            title: t.name,
            meta: `${t.categories.map(categorySingular).join(' · ')} · ${cityName(t.baseCity)}`,
            right: <span className="tabular text-xs text-fg-muted">{formatFeeBand(t.feeBand).range}</span>,
            image: t.images[0]!.src,
            verified: t.verified,
          })),
        },
        {
          label: 'Search',
          rows: [{ id: 'all', href: `/talent?q=${encodeURIComponent(debounced)}`, title: `See all results for “${debounced}”`, icon: <Search className="size-4" /> }],
        },
      ]
    : [
        {
          label: 'Categories',
          rows: CATEGORIES.map((c) => ({ id: `c-${c.slug}`, href: `/talent/${c.slug}`, title: c.name, meta: c.description.split(' — ')[0], icon: <Sparkles className="size-4" /> })),
        },
        {
          label: 'Cities',
          rows: CITIES.map((c) => ({ id: `city-${c.slug}`, href: `/talent?city=${c.slug}`, title: c.name, meta: c.state, icon: <MapPin className="size-4" /> })),
        },
      ];
  const flat = groups.flatMap((g) => g.rows);

  useEffect(() => setActive(0), [debounced]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  let index = -1;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                className="fixed top-[10vh] left-1/2 z-[111] flex max-h-[75vh] w-[min(640px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-float"
                initial={{ opacity: 0, scale: 0.97, x: '-50%', y: -8 }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: 0 }}
                exit={{ opacity: 0, scale: 0.98, x: '-50%', y: -6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <Dialog.Title className="sr-only">Search talent</Dialog.Title>
                <div className="flex items-center gap-3 border-b border-border px-5">
                  {results.isFetching ? <Loader2 className="size-5 shrink-0 animate-spin text-fg-muted" aria-hidden /> : <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />}
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActive((a) => Math.min(flat.length - 1, a + 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((a) => Math.max(0, a - 1));
                      } else if (e.key === 'Enter' && flat[active]) {
                        e.preventDefault();
                        go(flat[active]!.href);
                      }
                    }}
                    placeholder="Search singers, DJs, comedians, cities…"
                    role="combobox"
                    aria-expanded
                    aria-controls={listId}
                    aria-activedescendant={flat[active] ? `${listId}-${flat[active]!.id}` : undefined}
                    aria-autocomplete="list"
                    className="h-16 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-fg-subtle"
                  />
                  <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[0.6875rem] text-fg-muted sm:block">Esc</kbd>
                </div>

                <div ref={listRef} id={listId} role="listbox" aria-label="Results" data-lenis-prevent className="flex-1 overflow-y-auto p-2" style={{ overscrollBehavior: 'contain' }}>
                  {debounced && results.data?.items.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <p className="font-display text-xl font-extrabold">No match for “{debounced}”</p>
                      <p className="mt-1 text-sm text-fg-muted">Tell us the brief and we’ll source talent for you.</p>
                      <button type="button" onClick={() => go('/enquire')} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-brand-gradient px-5 text-sm font-semibold text-primary-fg">
                        Send a brief <ArrowRight className="size-4" aria-hidden />
                      </button>
                    </div>
                  )}
                  {groups.map((g) =>
                    g.rows.length === 0 ? null : (
                      <div key={g.label} role="group" aria-label={g.label} className="mb-2 last:mb-0">
                        <p className="px-3 pt-2 pb-1.5 text-[0.6875rem] font-semibold tracking-wide text-fg-subtle uppercase">{g.label}</p>
                        {g.rows.map((r) => {
                          index += 1;
                          const i = index;
                          const on = i === active;
                          return (
                            <div
                              key={r.id}
                              id={`${listId}-${r.id}`}
                              role="option"
                              aria-selected={on}
                              data-index={i}
                              onMouseMove={() => setActive(i)}
                              onClick={() => go(r.href)}
                              className={cn('relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5', on && 'bg-surface-2')}
                            >
                              {r.image ? (
                                <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                                  <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />
                                </span>
                              ) : (
                                <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-muted', on && 'bg-surface-3 text-primary-text')}>{r.icon}</span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                                  {r.title}
                                  {r.verified && <VerifiedBadge verified size="sm" />}
                                </span>
                                {r.meta && <span className="block truncate text-xs text-fg-muted">{r.meta}</span>}
                              </span>
                              {r.right}
                              <CornerDownLeft className={cn('size-4 shrink-0 text-fg-subtle transition-opacity', on ? 'opacity-100' : 'opacity-0')} aria-hidden />
                            </div>
                          );
                        })}
                      </div>
                    ),
                  )}
                </div>

                <div className="hidden items-center gap-4 border-t border-border px-5 py-3 text-[0.6875rem] text-fg-subtle sm:flex">
                  <span><kbd className="rounded border border-border px-1">↑</kbd> <kbd className="rounded border border-border px-1">↓</kbd> to move</span>
                  <span><kbd className="rounded border border-border px-1">↵</kbd> to open</span>
                  <span className="ml-auto">Fees are indicative bands</span>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Header trigger: icon on small screens, labelled pill with shortcut hint on wide ones. */
export function SearchButton({ className }: { className?: string }) {
  const { open } = useSearchPalette();
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Search talent"
      aria-keyshortcuts="Meta+K Control+K /"
      className={cn(
        'group/search flex h-10 items-center gap-2 rounded-full text-sm text-fg-muted transition-colors hover:text-fg',
        'w-10 justify-center hover:bg-surface-2 2xl:w-auto 2xl:justify-start 2xl:border 2xl:border-border 2xl:bg-surface/60 2xl:pr-2 2xl:pl-3.5 2xl:hover:border-border-strong 2xl:hover:bg-surface',
        className,
      )}
    >
      <Search className="size-[18px] shrink-0 2xl:size-4" aria-hidden />
      <span className="hidden 2xl:inline">Search talent</span>
      <kbd className="ml-6 hidden rounded-md border border-border bg-bg px-1.5 py-0.5 font-sans text-[0.6875rem] text-fg-subtle 2xl:inline">{mac ? '⌘' : 'Ctrl'} K</kbd>
    </button>
  );
}
