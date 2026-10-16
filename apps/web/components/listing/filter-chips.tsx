'use client';

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { X } from 'lucide-react';
import { EVENT_TYPE_LABELS, formatDate } from '@repo/utils';
import { BUDGET_OPTIONS, categoryName, cityName } from '@/lib/reference';
import type { FilterKey, Filters } from './query';

function chipLabel(k: FilterKey, f: Filters): string | null {
  switch (k) {
    case 'q': return f.q ? `“${f.q}”` : null;
    case 'category': return f.category ? categoryName(f.category) : null;
    case 'city': return f.city ? cityName(f.city) : null;
    case 'date': return f.date ? formatDate(f.date) : null;
    case 'eventType': return f.eventType ? EVENT_TYPE_LABELS[f.eventType] : null;
    case 'language': return f.language ?? null;
    case 'budget': return f.budget ? BUDGET_OPTIONS.find((b) => b.value === f.budget)?.label ?? null : null;
    case 'verified': return f.verified ? 'Verified only' : null;
    default: return null;
  }
}

/** Active filters as removable chips; chips animate in/out and siblings reflow with layout. */
export function FilterChips({ filters, locked, onRemove, onClear }: { filters: Filters; locked: Filters; onRemove: (k: FilterKey) => void; onClear: () => void }) {
  const reduce = useReducedMotion();
  const keys = (['q', 'category', 'city', 'date', 'budget', 'eventType', 'language', 'verified'] as FilterKey[]).filter((k) => !(k in locked) && chipLabel(k, filters));
  return (
    <LayoutGroup>
      <motion.ul layout={!reduce} className="flex flex-wrap items-center gap-2" aria-label="Active filters">
        <AnimatePresence mode="popLayout" initial={false}>
          {keys.map((k) => (
            <motion.li
              key={k}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button
                type="button"
                onClick={() => onRemove(k)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pr-2 pl-3 text-sm font-medium transition-colors hover:border-border-strong"
                aria-label={`Remove filter: ${chipLabel(k, filters)}`}
              >
                {chipLabel(k, filters)}
                <span className="grid size-5 place-items-center rounded-full bg-surface-3 transition-colors group-hover:bg-fg group-hover:text-bg">
                  <X className="size-3" aria-hidden />
                </span>
              </button>
            </motion.li>
          ))}
          {keys.length > 1 && (
            <motion.li key="clear" layout={!reduce} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" onClick={onClear} className="px-2 py-1.5 text-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                Clear all
              </button>
            </motion.li>
          )}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}
