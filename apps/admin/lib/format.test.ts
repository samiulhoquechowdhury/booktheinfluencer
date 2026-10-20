import { describe, expect, it } from 'vitest';
import { parseRupees, rupeesInput } from './format';

describe('rupee input parsing (exact paise)', () => {
  it('parses whole and fractional rupees without floats', () => {
    expect(parseRupees('1234')).toBe(123_400n);
    expect(parseRupees('1234.5')).toBe(123_450n);
    expect(parseRupees('0.07')).toBe(7n);
    expect(parseRupees('1,65,200.10')).toBe(16_520_010n);
    expect(parseRupees('999999999999.99')).toBe(99_999_999_999_999n);
  });
  it('rejects anything else', () => {
    for (const bad of ['', 'abc', '1.234', '-5', '1e3']) expect(parseRupees(bad)).toBeNull();
  });
  it('round-trips through the input format', () => {
    expect(rupeesInput('16520010')).toBe('165200.10');
    expect(parseRupees(rupeesInput(7n))).toBe(7n);
  });
});
