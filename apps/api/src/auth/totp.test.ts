import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, generateTotpSecret, otpauthUrl, totpAt, verifyTotp } from './totp';
import { SecretBox } from './secret-box';

// RFC 6238 Appendix B (SHA1 key "12345678901234567890"); 6-digit codes are the last 6 of the 8.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP (RFC 6238)', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('t=%i → %s', (t, code) => expect(totpAt(RFC_SECRET, Math.floor(t / 30))).toBe(code));

  it('base32 round-trips', () => {
    const buf = Buffer.from('hello authenticator');
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  it('accepts ±1 step of clock drift and refuses replays', () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30_000);
    const s = generateTotpSecret();
    expect(verifyTotp(s, totpAt(s, step), null, now)).toBe(step);
    expect(verifyTotp(s, totpAt(s, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(s, totpAt(s, step - 2), null, now)).toBeNull();
    expect(verifyTotp(s, totpAt(s, step), step, now)).toBeNull(); // already used
    expect(verifyTotp(s, 'abcdef', null, now)).toBeNull();
  });

  it('builds an otpauth URL for authenticator apps', () => {
    expect(otpauthUrl('ABC', 'priya@example.com')).toBe('otpauth://totp/BookTheInfluencer%3Apriya%40example.com?secret=ABC&issuer=BookTheInfluencer&algorithm=SHA1&digits=6&period=30');
  });
});

describe('SecretBox (AES-256-GCM)', () => {
  const box = new SecretBox(Buffer.alloc(32, 1).toString('base64'));
  it('round-trips and never stores plaintext', () => {
    const sealed = box.seal('JBSWY3DPEHPK3PXP');
    expect(sealed).not.toContain('JBSWY3DPEHPK3PXP');
    expect(box.open(sealed)).toBe('JBSWY3DPEHPK3PXP');
    expect(box.seal('x')).not.toBe(box.seal('x')); // random IV
  });
  it('rejects tampering', () => {
    const [v, iv, tag, data] = box.seal('secret').split('.');
    const bytes = Buffer.from(data!, 'base64url');
    bytes[0] = bytes[0]! ^ 0xff; // flip one ciphertext byte
    expect(() => box.open([v, iv, tag, bytes.toString('base64url')].join('.'))).toThrow();
  });
});
