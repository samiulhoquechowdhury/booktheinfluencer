import { describe, expect, it } from 'vitest';
import { approvalReasons, calculateQuote, milestoneAmounts, type QuoteLineCalc } from './quote';

const line = (o: Partial<QuoteLineCalc>): QuoteLineCalc => ({ type: 'OTHER', customerAmountPaise: 0n, internalCostPaise: 0n, payoutPaise: null, taxRateBps: 1800, ...o });

describe('calculateQuote', () => {
  it('rounds tax half-up per line and sums the rounded lines', () => {
    // 18% of 3 paise = 0.54 → 1; of 2 paise = 0.36 → 0.
    const t = calculateQuote([line({ customerAmountPaise: 3n }), line({ customerAmountPaise: 2n }), line({ customerAmountPaise: 3n })]);
    expect(t.lineTaxPaise).toEqual([1n, 0n, 1n]);
    expect(t.taxPaise).toBe(2n); // whole-quote rounding would give round(1.44) = 1
    expect(t.totalPaise).toBe(10n);
  });

  it('computes margin from subtotal minus payouts and internal costs', () => {
    const t = calculateQuote([
      line({ type: 'TALENT_FEE', customerAmountPaise: 500_000_00n, payoutPaise: 400_000_00n }),
      line({ type: 'TRAVEL', customerAmountPaise: 50_000_00n, internalCostPaise: 40_000_00n }),
      line({ type: 'SERVICE_FEE', customerAmountPaise: 25_000_00n, taxRateBps: 1800 }),
    ]);
    expect(t.subtotalPaise).toBe(575_000_00n);
    expect(t.taxPaise).toBe(103_500_00n);
    expect(t.totalPaise).toBe(678_500_00n);
    expect(t.talentFeePaise).toBe(500_000_00n);
    expect(t.marginPaise).toBe(135_000_00n);
    expect(t.marginBps).toBe(2347); // 23.47%
  });

  it('handles an empty or zero quote, and negative margins', () => {
    expect(calculateQuote([]).marginBps).toBe(0);
    const t = calculateQuote([line({ type: 'TALENT_FEE', customerAmountPaise: 100n, payoutPaise: 150n })]);
    expect(t.marginPaise).toBe(-50n);
    expect(t.marginBps).toBe(-5000);
  });

  it('works beyond Number.MAX_SAFE_INTEGER', () => {
    const big = 9_007_199_254_740_993_00n;
    expect(calculateQuote([line({ customerAmountPaise: big, taxRateBps: 0 })]).totalPaise).toBe(big);
  });
});

describe('milestoneAmounts', () => {
  it('splits by percentage and gives the remainder to the last milestone', () => {
    expect(milestoneAmounts(100_001n, [{ percentBps: 3333 }, { percentBps: 3333 }, { percentBps: 3334 }])).toEqual([33_330n, 33_330n, 33_341n]);
    expect(milestoneAmounts(1000n, [{ percentBps: 10_000 }])).toEqual([1000n]);
    expect(milestoneAmounts(1000n, [])).toEqual([]);
  });
  it('rejects plans that do not add up to 100%', () => {
    expect(() => milestoneAmounts(1000n, [{ percentBps: 5000 }, { percentBps: 4000 }])).toThrow(/100%/);
  });
});

describe('approvalReasons', () => {
  it('flags below-minimum fees and thin margins', () => {
    expect(approvalReasons({ talentFeePaise: 90n, marginBps: 2000 }, { minimumRatePaise: 100n, marginFloorBps: 1000 })).toEqual(['BELOW_MINIMUM_RATE']);
    expect(approvalReasons({ talentFeePaise: 100n, marginBps: 999 }, { minimumRatePaise: 100n, marginFloorBps: 1000 })).toEqual(['MARGIN_BELOW_FLOOR']);
    expect(approvalReasons({ talentFeePaise: 100n, marginBps: 1000 }, { minimumRatePaise: 100n, marginFloorBps: 1000 })).toEqual([]);
    expect(approvalReasons({ talentFeePaise: 1n, marginBps: 5000 }, { minimumRatePaise: null, marginFloorBps: 1000 })).toEqual([]);
  });
});
