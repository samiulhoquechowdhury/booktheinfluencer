import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Staff password hashing with scrypt (Node built-in, no native dependency).
 * Stored format: `scrypt$N$r$p$<salt b64>$<hash b64>` so parameters can be raised later.
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LEN = 64;
export const MIN_PASSWORD_LENGTH = 12;

const derive = (password: string, salt: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) => (err ? reject(err) : resolve(key))),
  );

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

/** Constant-time check. Returns false (never throws) for malformed stored hashes. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const parts = stored?.split('$');
  if (!parts || parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash!, 'base64');
  const key = await derive(password, Buffer.from(salt!, 'base64'), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}
