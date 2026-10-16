'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { AnimatePresence, LayoutGroup, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { TalentPage } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { Select } from '@repo/ui/select';
import { cn } from '@repo/ui/lib/cn';
import { api, ApiError } from '@/lib/api/client';
import { TalentCard } from '@/components/talent/talent-card';
import { TalentCardSkeleton } from '@/components/talent/talent-card-skeleton';
import { FilterChips } from './filter-chips';
import { FilterPanel } from './filter-panel';
import { MobileFilterSheet } from './mobile-filter-sheet';
import { clean, filtersFromSearch, sameFilters, searchFromFilters, type FilterKey, type Filters } from './query';

const PAGE_SIZE = 12;

/**
 * Listing: desktop filter rail + grid; mobile sticky bar + bottom sheet. Filters live in the URL
 * (replaceState — no server round-trip). Grid reflows with layout animation, not jump cuts.
 */
export function ListingView({ initial, locked = {} }: { initial: TalentPage; locked?: Filters }) {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [filters, setFilters] = useState<Filters>(() => filtersFromSearch(new URLSearchParams(params.toString()), locked));
  const [qDebounced, setQDebounced] = useState(filters.q);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const effective = useMemo(() => clean({ ...filters, q: qDebounced }), [filters, qDebounced]);
  const isInitial = sameFilters(effective, locked);

  const query = useInfiniteQuery({
    queryKey: ['talents', 'infinite', effective],
    queryFn: ({ pageParam }) => api.talents.list({ ...effective, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    initialData: isInitial ? { pages: [initial], pageParams: [1] } : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  useEffect(() => {
    const url = `${window.location.pathname}${searchFromFilters(effective, locked)}`;
    window.history.replaceState(window.history.state, '', url);
  }, [effective, locked]);

  const set = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), []);
  const remove = (k: FilterKey) => set({ [k]: undefined } as Partial<Filters>);
  const clearAll = () => setFilters({ ...locked });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total;
  const activeCount = Object.keys(clean(filters)).filter((k) => !(k in locked) && k !== 'sort').length;

  // Mobile toolbar hides on scroll down, returns on scroll up.
  const { scrollY } = useScroll();
  const [barHidden, setBarHidden] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setBarHidden(y > 300 && y > prev);
  });

  const sentinel = useRef<HTMLDivElement>(null);

  return (
    <div className="shell pb-24">
      <div className="grid gap-10 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] xl:gap-14">
        {/* Desktop rail */}
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="glass sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl p-5" data-lenis-prevent>
            <FilterPanel filters={filters} set={set} locked={locked} />
          </div>
        </aside>

        <section aria-labelledby="results-heading" aria-busy={query.isFetching}>
          {/* Toolbar */}
          <motion.div
            className="glass sticky top-[4.25rem] z-30 -mx-4 mb-6 flex items-center justify-between gap-3 border-x-0 px-4 py-3 md:top-[5rem] md:-mx-8 md:px-8 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
            animate={{ y: barHidden && !reduce ? '-140%' : '0%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="lg:hidden">
              <MobileFilterSheet filters={filters} set={set} locked={locked} activeCount={activeCount} total={total} onClear={clearAll} />
            </div>
            <p id="results-heading" className="tabular hidden text-sm text-fg-muted lg:block" aria-live="polite">
              {total === undefined ? 'Loading talent…' : `${total} ${total === 1 ? 'act' : 'acts'} match`}
              {query.isFetching && !query.isFetchingNextPage && <Loader2 className="ml-2 inline size-3.5 animate-spin" aria-hidden />}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="sort" className="text-fg-muted max-sm:sr-only">Sort</label>
              <Select
                id="sort"
                variant="pill"
                value={filters.sort ?? 'relevance'}
                onValueChange={(v) => set({ sort: v === 'relevance' ? undefined : (v as Filters['sort']) })}
                options={[
                  { value: 'relevance', label: 'Relevance', description: 'Featured and premium first' },
                  { value: 'fee_asc', label: 'Fee: low to high' },
                  { value: 'fee_desc', label: 'Fee: high to low' },
                ]}
                contentClassName="min-w-[15rem]"
              />
            </div>
          </motion.div>

          <div className="mb-6 min-h-0">
            <FilterChips filters={filters} locked={locked} onRemove={remove} onClear={clearAll} />
          </div>

          {query.isError && !query.data ? (
            <EmptyState
              art="error"
              title="We couldn’t load talent"
              description={query.error instanceof ApiError ? query.error.message : 'Check your connection and try again.'}
              action={<Button onClick={() => void query.refetch()}>Try again</Button>}
            />
          ) : !query.data ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 md:gap-x-6 md:gap-y-10 2xl:grid-cols-4">
              {Array.from({ length: 6 }, (_, i) => <TalentCardSkeleton key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              art="search"
              title="No match? We’ll source it."
              description="Tell us your brief and we’ll source talent for you — including acts not listed yet."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild><Link href="/enquire">Tell us your brief</Link></Button>
                  {activeCount > 0 && <Button variant="outline" onClick={clearAll}>Clear filters</Button>}
                </div>
              }
            />
          ) : (
            <LayoutGroup>
              <motion.ul
                className={cn('grid grid-cols-2 gap-x-3 gap-y-8 transition-opacity sm:gap-x-4 md:grid-cols-3 md:gap-x-6 md:gap-y-10 2xl:grid-cols-4', query.isPlaceholderData && 'opacity-60')}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((t, i) => (
                    <motion.li
                      key={t.slug}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: reduce ? 0 : Math.min(i % PAGE_SIZE, 8) * 0.03 }}
                    >
                      <TalentCard talent={t} priority={i < 2} sizes="(min-width: 1440px) 240px, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 47vw" />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </LayoutGroup>
          )}

          {query.hasNextPage && (
            <div ref={sentinel} className="mt-14 flex justify-center">
              <Button variant="outline" size="lg" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? <><Loader2 className="animate-spin" aria-hidden /> Loading</> : `Show more (${(total ?? 0) - items.length} left)`}
              </Button>
            </div>
          )}
          {query.isError && query.data && (
            <p role="alert" className="mt-6 text-center text-sm text-danger">Couldn’t refresh results. Showing the last ones we loaded.</p>
          )}
        </section>
      </div>
    </div>
  );
}
