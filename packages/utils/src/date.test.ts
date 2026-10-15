import { describe, expect, it } from 'vitest';
import { daysUntil, formatDate, formatDateTime, formatTime, todayIST } from './date';

describe('IST dates', () => {
  it('formats calendar dates', () => {
    expect(formatDate('2027-02-14')).toBe('Sun, 14 Feb 2027');
  });
  it('formats wall-clock times', () => {
    expect(formatTime('19:30')).toBe('7:30 PM IST');
    expect(formatTime('00:05')).toBe('12:05 AM IST');
  });
  it('converts UTC instants to IST', () => {
    expect(formatDateTime('2027-02-13T20:00:00Z')).toBe('Sun, 14 Feb 2027 · 1:30 AM IST');
  });
  it('computes today in IST across the UTC date line', () => {
    expect(todayIST(new Date('2026-10-15T20:00:00Z'))).toBe('2026-10-16');
    expect(daysUntil('2026-10-20', new Date('2026-10-15T20:00:00Z'))).toBe(4);
  });
});
