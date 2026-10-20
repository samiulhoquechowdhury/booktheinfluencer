/**
 * Quote calculations (trd §6, T-180). Integer paise and basis points only; tax is rounded half-up
 * per line and totals are sums of the rounded lines.
 */
import { applyBps, sumPaise } from './money';

export type QuoteLineCalc = {
  type: string;
  customerAmountPaise: bigint;
  internalCostPaise: bigint;
  /** Talent payout for talent-fee lines; null = not entered yet. */
  payoutPaise: bigint | null;
  taxRateBps: number;
};

export type MilestonePlanItem = { label: string; percentBps: number; dueDate: string };

export type QuoteTotals = {
  subtotalPaise: bigint;
  taxPaise: bigint;
  totalPaise: bigint;
  talentFeePaise: bigint;
  payoutTotalPaise: bigint;
  internalCostPaise: bigint;
  marginPaise: bigint;
  /** Margin as a share of the pre-tax subtotal; 0 when the subtotal is 0. */
  marginBps: number;
  lineTaxPaise: bigint[];
};

export function calculateQuote(lines: readonly QuoteLineCalc[]): QuoteTotals {
  const lineTaxPaise = lines.map((l) => applyBps(l.customerAmountPaise, l.taxRateBps));
  const subtotalPaise = sumPaise(lines.map((l) => l.customerAmountPaise));
  const taxPaise = sumPaise(lineTaxPaise);
  const payoutTotalPaise = sumPaise(lines.map((l) => l.payoutPaise ?? 0n));
  const internalCostPaise = sumPaise(lines.map((l) => l.internalCostPaise));
  const marginPaise = subtotalPaise - payoutTotalPaise - internalCostPaise;
  return {
    subtotalPaise,
    taxPaise,
    totalPaise: subtotalPaise + taxPaise,
    talentFeePaise: sumPaise(lines.filter((l) => l.type === 'TALENT_FEE').map((l) => l.customerAmountPaise)),
    payoutTotalPaise,
    internalCostPaise,
    marginPaise,
    marginBps: subtotalPaise === 0n ? 0 : Number((marginPaise * 10_000n) / subtotalPaise),
    lineTaxPaise,
  };
}

/** Milestone amounts from the total; the last milestone absorbs rounding so they always add up. */
export function milestoneAmounts(totalPaise: bigint, plan: readonly Pick<MilestonePlanItem, 'percentBps'>[]): bigint[] {
  if (!plan.length) return [];
  if (plan.reduce((a, m) => a + m.percentBps, 0) !== 10_000) throw new RangeError('Milestone percentages must add up to 100%');
  const head = plan.slice(0, -1).map((m) => applyBps(totalPaise, m.percentBps));
  return [...head, totalPaise - sumPaise(head)];
}

export type ApprovalReason = 'BELOW_MINIMUM_RATE' | 'MARGIN_BELOW_FLOOR';

/** QUO-6: below the talent's minimum rate, or margin under the floor, needs SUPER_ADMIN approval. */
export function approvalReasons(t: Pick<QuoteTotals, 'talentFeePaise' | 'marginBps'>, opts: { minimumRatePaise: bigint | null; marginFloorBps: number }): ApprovalReason[] {
  const reasons: ApprovalReason[] = [];
  if (opts.minimumRatePaise != null && t.talentFeePaise < opts.minimumRatePaise) reasons.push('BELOW_MINIMUM_RATE');
  if (t.marginBps < opts.marginFloorBps) reasons.push('MARGIN_BELOW_FLOOR');
  return reasons;
}
