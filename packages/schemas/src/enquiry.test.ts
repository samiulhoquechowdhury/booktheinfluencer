import { describe, expect, it } from 'vitest';
import { IndianMobileSchema } from './enquiry';

describe('IndianMobileSchema', () => {
  it.each([
    ['9864012345', '9864012345'],
    ['+91 98640 12345', '9864012345'],
    ['919864012345', '9864012345'],
    ['09864012345', '9864012345'],
    ['98640-12345', '9864012345'],
    // Numbers that themselves start with 91 must not lose digits.
    ['9123456789', '9123456789'],
    ['+919123456789', '9123456789'],
  ])('%s → %s', (input, out) => expect(IndianMobileSchema.parse(input)).toBe(out));

  it.each(['12345', '5864012345', '+1 9864012345', '98640123456'])('rejects %s', (input) => expect(IndianMobileSchema.safeParse(input).success).toBe(false));
});
