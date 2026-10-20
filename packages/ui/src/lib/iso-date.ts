/** YYYY-MM-DD ↔ local Date (no time zone shift). Kept apart from calendar.tsx so importing them doesn't load react-day-picker. */
export const dateToIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isoToDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};
