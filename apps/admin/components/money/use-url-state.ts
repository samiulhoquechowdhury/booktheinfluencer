'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Read/write list filters in the URL so views can be shared and survive reloads. */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return { sp, set, page: Math.max(1, Number(sp.get('page')) || 1) };
}
