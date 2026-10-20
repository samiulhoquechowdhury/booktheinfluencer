import { formatINR, formatINRShort } from '@repo/utils';

export const inr = (paise: string | null | undefined) => (paise == null ? '—' : formatINR(BigInt(paise)));
export const inrShort = (paise: string | null | undefined) => (paise == null ? '—' : formatINRShort(BigInt(paise)));
export const rupeesRange = (b: { minRupees: number | null; maxRupees: number | null }) =>
  b.minRupees == null || b.maxRupees == null ? '—' : `${formatINRShort(BigInt(b.minRupees) * 100n)} – ${formatINRShort(BigInt(b.maxRupees) * 100n)}`;
export const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
export const titleCase = (s: string) => s.toLowerCase().replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const day = (iso: string) => dateFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso));
export const when = (iso: string) => dateTimeFmt.format(new Date(iso));
