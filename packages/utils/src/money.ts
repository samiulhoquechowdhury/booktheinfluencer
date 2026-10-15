/** Money helpers. All amounts are integer paise as `bigint` — never floats (rules.md §0.3). */

const PAISE_PER_RUPEE = 100n;
const LAKH_PAISE = 100_000n * PAISE_PER_RUPEE;
const CRORE_PAISE = 10_000_000n * PAISE_PER_RUPEE;

const groupFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const rupeesToPaise = (rupees: bigint | number): bigint => {
  if (typeof rupees === 'number' && !Number.isInteger(rupees)) {
    throw new RangeError('rupeesToPaise expects whole rupees');
  }
  return BigInt(rupees) * PAISE_PER_RUPEE;
};

/** "₹1,20,000" — Indian grouping; paise shown only when non-zero ("₹1,20,000.50"). */
export function formatINR(paise: bigint, opts: { showPaise?: boolean } = {}): string {
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const rupees = abs / PAISE_PER_RUPEE;
  const rem = abs % PAISE_PER_RUPEE;
  const showPaise = opts.showPaise ?? rem !== 0n;
  const body = groupFormatter.format(rupees) + (showPaise ? `.${rem.toString().padStart(2, '0')}` : '');
  return `${negative ? '−' : ''}₹${body}`;
}

function oneDecimal(paise: bigint, unit: bigint): string {
  const tenths = (paise * 10n + unit / 2n) / unit; // round half up to one decimal
  const whole = tenths / 10n;
  const frac = tenths % 10n;
  return frac === 0n ? whole.toString() : `${whole}.${frac}`;
}

/** Compact Indian shorthand used only in fee bands: "₹75,000", "₹2L", "₹2.5L", "₹1.2Cr". */
export function formatINRShort(paise: bigint): string {
  if (paise >= CRORE_PAISE) return `₹${oneDecimal(paise, CRORE_PAISE)}Cr`;
  if (paise >= LAKH_PAISE) return `₹${oneDecimal(paise, LAKH_PAISE)}L`;
  return formatINR(paise);
}

export type FeeBandLike = { minPaise: bigint; maxPaise: bigint } | null;

/** "₹2L – ₹4L" or "On request". Never a single fee (rules.md §0.6). */
export function formatFeeBand(band: FeeBandLike): { range: string; qualifier: string } {
  if (!band) return { range: 'On request', qualifier: '' };
  return {
    range: `${formatINRShort(band.minPaise)} – ${formatINRShort(band.maxPaise)}`,
    qualifier: 'indicative',
  };
}

/** Apply basis points with banker-free half-up rounding to the paise. */
export function applyBps(paise: bigint, bps: number): bigint {
  if (!Number.isInteger(bps)) throw new RangeError('bps must be an integer');
  return (paise * BigInt(bps) + 5_000n) / 10_000n;
}

export const sumPaise = (values: readonly bigint[]): bigint => values.reduce((a, b) => a + b, 0n);

/** Animate-friendly split for count-up: whole rupees as a safe JS number (display only). */
export function paiseToDisplayRupees(paise: bigint): number {
  const rupees = paise / PAISE_PER_RUPEE;
  if (rupees > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Amount too large to animate');
  return Number(rupees);
}
