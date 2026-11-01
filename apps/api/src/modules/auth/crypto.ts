import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const hmac = (secret: string, value: string) => createHmac('sha256', secret).update(value).digest('hex');

export const randomToken = () => randomBytes(32).toString('base64url');

export const randomCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
