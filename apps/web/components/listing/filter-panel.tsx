'use client';

import { Search, X } from 'lucide-react';
import { EVENT_TYPES, LANGUAGES } from '@repo/schemas';
import { EVENT_TYPE_LABELS, todayIST } from '@repo/utils';
import { cn } from '@repo/ui/lib/cn';
import { BUDGET_OPTIONS, CATEGORIES, CITIES } from '@/lib/reference';
import type { Filters } from './query';

const label = 'mb-2 block text-xs font-semibold tracking-wide text-fg-muted uppercase';
const control =
  'h-11 w-full appearance-none rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none transition-[border-color,box-shadow] focus:border-primary-text focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_20%,transparent)]';

/** Shared filter controls (desktop rail + mobile sheet). */
export function FilterPanel({
  filters,
  set,
  locked,
  className,
}: {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  locked: Filters;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <label htmlFor="f-q" className={label}>Search</label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            id="f-q"
            type="search"
            placeholder="Name, style, language…"
            defaultValue={filters.q ?? ''}
            onChange={(e) => set({ q: e.target.value || undefined })}
            className={cn(control, 'pl-9')}
          />
        </div>
      </div>

      {!locked.category && (
        <fieldset>
          <legend className={label}>Category</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = filters.category === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ category: on ? undefined : c.slug })}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition-[background-color,border-color,color,transform] active:scale-[0.97]',
                    on ? 'border-transparent bg-fg text-bg' : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {!locked.city && (
        <div>
          <label htmlFor="f-city" className={label}>City (base or travels to)</label>
          <select id="f-city" value={filters.city ?? ''} onChange={(e) => set({ city: (e.target.value || undefined) as Filters['city'] })} className={control}>
            <option value="">Any city</option>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="f-date" className={label}>Event date</label>
        <div className="relative">
          <input id="f-date" type="date" min={todayIST()} value={filters.date ?? ''} onChange={(e) => set({ date: e.target.value || undefined })} className={control} aria-describedby="f-date-hint" />
          {filters.date && (
            <button type="button" onClick={() => set({ date: undefined })} aria-label="Clear date" className="absolute top-1/2 right-9 -translate-y-1/2 rounded-full p-1 text-fg-subtle hover:text-fg">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <p id="f-date-hint" className="mt-1.5 text-xs text-fg-subtle">Hides talent with a known blackout. Availability is always confirmed by your manager.</p>
      </div>

      <fieldset>
        <legend className={label}>Budget (indicative)</legend>
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_OPTIONS.map((b) => {
            const on = filters.budget === b.value;
            return (
              <button
                key={b.value}
                type="button"
                aria-pressed={on}
                onClick={() => set({ budget: on ? undefined : b.value })}
                className={cn(
                  'tabular rounded-lg border px-3 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] active:scale-[0.97]',
                  on ? 'border-primary-text bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-fg' : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="f-event" className={label}>Event type</label>
        <select id="f-event" value={filters.eventType ?? ''} onChange={(e) => set({ eventType: (e.target.value || undefined) as Filters['eventType'] })} className={control}>
          <option value="">Any event</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-lang" className={label}>Language</label>
        <select id="f-lang" value={filters.language ?? ''} onChange={(e) => set({ language: (e.target.value || undefined) as Filters['language'] })} className={control}>
          <option value="">Any language</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-3">
        <span className="text-sm font-medium">Verified representation only</span>
        <input
          type="checkbox"
          role="switch"
          checked={!!filters.verified}
          onChange={(e) => set({ verified: e.target.checked || undefined })}
          className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-surface-3 transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-fg before:transition-transform before:duration-(--duration-base) checked:bg-gold checked:before:translate-x-5 checked:before:bg-black"
        />
      </label>
    </div>
  );
}
