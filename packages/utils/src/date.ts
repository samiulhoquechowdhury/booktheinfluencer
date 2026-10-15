/** Dates: stored UTC, displayed in IST (Asia/Kolkata). Calendar dates are YYYY-MM-DD in IST. */
export const IST = 'Asia/Kolkata';

const toDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
};

function parts(value: string | Date, opts: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-IN', { timeZone: IST, ...opts }).formatToParts(
    toDate(value),
  )) {
    out[p.type] = p.value;
  }
  return out;
}

/** "Sat, 14 Feb 2027" */
export function formatDate(value: string | Date): string {
  const p = parts(value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "14 Feb" */
export function formatDateShort(value: string | Date): string {
  const p = parts(value, { day: 'numeric', month: 'short' });
  return `${p.day} ${p.month}`;
}

/** "7:30 PM IST" from a Date/ISO string, or from "19:30" wall-clock time (already IST). */
export function formatTime(value: string | Date): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    const [h = 0, m = 0] = value.split(':').map(Number);
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} IST`;
  }
  const p = parts(value, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${p.hour}:${p.minute} ${(p.dayPeriod ?? '').toUpperCase()} IST`;
}

/** "Sat, 14 Feb 2027 · 7:30 PM IST" */
export const formatDateTime = (value: string | Date): string =>
  `${formatDate(value)} · ${formatTime(value)}`;

/** Today's calendar date in IST as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  const p = parts(now, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Whole days from today (IST) until a calendar date; negative if past. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const a = toDate(todayIST(now)).getTime();
  const b = toDate(isoDate.slice(0, 10)).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Converts a Date picked in the browser to YYYY-MM-DD as seen in IST. */
export const toIsoDateIST = (d: Date): string => todayIST(d);
