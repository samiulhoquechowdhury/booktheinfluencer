import {
  BudgetBandSchema,
  CategorySlugSchema,
  CitySlugSchema,
  EventTypeSchema,
  IsoDateSchema,
  LanguageSchema,
  TalentSortSchema,
  type TalentQuery,
} from '@repo/schemas';

export type Filters = Omit<TalentQuery, 'page' | 'pageSize'>;
export const FILTER_KEYS = ['q', 'category', 'city', 'date', 'eventType', 'language', 'budget', 'verified', 'sort'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** URL → filters, dropping anything invalid (never trust the URL). */
export function filtersFromSearch(sp: URLSearchParams, locked: Filters = {}): Filters {
  const pick = <T,>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, key: string) => {
    const r = schema.safeParse(sp.get(key) ?? undefined);
    return r.success ? r.data : undefined;
  };
  const q = sp.get('q')?.trim().slice(0, 80) || undefined;
  const sort = pick(TalentSortSchema, 'sort');
  return {
    q,
    category: pick(CategorySlugSchema, 'category'),
    city: pick(CitySlugSchema, 'city'),
    date: pick(IsoDateSchema, 'date'),
    eventType: pick(EventTypeSchema, 'eventType'),
    language: pick(LanguageSchema, 'language'),
    budget: pick(BudgetBandSchema, 'budget'),
    verified: sp.get('verified') === 'true' ? true : undefined,
    sort: sort === 'relevance' ? undefined : sort,
    ...locked,
  };
}

export function searchFromFilters(f: Filters, locked: Filters = {}): string {
  const sp = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    if (k in locked) continue;
    const v = f[k];
    if (v !== undefined && v !== '' && v !== false) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const clean = (f: Filters): Filters =>
  Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== false)) as Filters;

export const sameFilters = (a: Filters, b: Filters) => JSON.stringify(clean(a)) === JSON.stringify(clean(b));
