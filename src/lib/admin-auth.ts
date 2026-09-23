import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'admin_session';
export const SESSION_SECONDS = 60 * 60 * 2;

const password = () => process.env.ADMIN_PASSWORD || '';
const secret = () => process.env.ADMIN_SESSION_SECRET || '';

export const adminConfigured = () => password().length > 0 && secret().length >= 32;

const sha256 = (s: string) => createHash('sha256').update(s).digest();
const hmac = (payload: string, key: string) => createHmac('sha256', key).update(payload).digest('base64url');

// Hashing both sides first makes the comparison constant-time regardless of length.
export const passwordMatches = (candidate: string) =>
  adminConfigured() && timingSafeEqual(sha256(candidate), sha256(password()));

// Token = "<expiry epoch seconds>.<hmac>". No server-side session store needed.
export function signSession(nowSeconds: number, key = secret()) {
  const exp = String(nowSeconds + SESSION_SECONDS);
  return `${exp}.${hmac(exp, key)}`;
}

export function verifySession(token: string | undefined, nowSeconds: number, key = secret()) {
  if (!token || !key) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < nowSeconds) return false;
  const expected = Buffer.from(hmac(exp, key));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Reads the cookie before anything else: that is what marks the calling route as dynamic.
// Short-circuiting on config first let Next prerender admin pages at build time, without env vars.
export function isAdmin() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  return adminConfigured() && verifySession(token, Math.floor(Date.now() / 1000));
}
