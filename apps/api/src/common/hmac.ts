import { createHmac, timingSafeEqual } from 'node:crypto';

/** Hex HMAC-SHA256 of the raw request body, as webhook providers send it. */
export const hmacHex = (secret: string, body: Buffer | string) => createHmac('sha256', secret).update(body).digest('hex');

/** Constant-time check of a hex signature header. */
export function verifyHmac(secret: string, body: Buffer | undefined, signature: string | undefined) {
  if (!body || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(hmacHex(secret, body), 'hex');
  const given = Buffer.from(signature, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}
