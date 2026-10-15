import { describe, expect, it } from 'vitest';
import { applyBps, formatFeeBand, formatINR, formatINRShort, rupeesToPaise, sumPaise } from './money';

describe('formatINR', () => {
  it('uses Indian grouping', () => {
    expect(formatINR(12_000_000n)).toBe('₹1,20,000');
    expect(formatINR(1_000_000_000n)).toBe('₹1,00,00,000');
    expect(formatINR(0n)).toBe('₹0');
  });
  it('shows paise only when present', () => {
    expect(formatINR(12_000_050n)).toBe('₹1,20,000.50');
    expect(formatINR(500n, { showPaise: true })).toBe('₹5.00');
  });
  it('handles negatives', () => {
    expect(formatINR(-10_000n)).toBe('−₹100');
  });
  it('handles amounts beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatINR(9_007_199_254_740_993_00n)).toBe('₹9,00,71,99,25,47,40,993');
  });
});

describe('formatINRShort / formatFeeBand', () => {
  it('abbreviates lakhs and crores', () => {
    expect(formatINRShort(rupeesToPaise(200_000))).toBe('₹2L');
    expect(formatINRShort(rupeesToPaise(250_000))).toBe('₹2.5L');
    expect(formatINRShort(rupeesToPaise(12_000_000))).toBe('₹1.2Cr');
    expect(formatINRShort(rupeesToPaise(75_000))).toBe('₹75,000');
  });
  it('formats a band, never a single fee', () => {
    expect(formatFeeBand({ minPaise: rupeesToPaise(200_000), maxPaise: rupeesToPaise(400_000) })).toEqual({
      range: '₹2L – ₹4L',
      qualifier: 'indicative',
    });
    expect(formatFeeBand(null).range).toBe('On request');
  });
});

describe('applyBps / sumPaise', () => {
  it('computes 18% GST with half-up rounding', () => {
    expect(applyBps(100_000n, 1800)).toBe(18_000n);
    expect(applyBps(333n, 1800)).toBe(60n); // 59.94 → 60
  });
  it('sums', () => expect(sumPaise([1n, 2n, 3n])).toBe(6n));
  it('rejects fractional rupees', () => expect(() => rupeesToPaise(1.5)).toThrow());
});
