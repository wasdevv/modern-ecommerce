import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { brCode } from './brcode';
import { TEST_CARDS } from './test-cards';
import type { CardCharge, PaymentEvent, PaymentProvider, PixCharge } from './types';

// A fake gateway that behaves like a real one: cards are tokenized before the store sees them,
// Pix produces a real-format BR Code, and confirmations arrive as signed webhooks. Nothing is ever charged.

export const PIX_TTL_MS = 30 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const WEBHOOK_TOLERANCE_S = 300;
// The ".invalid" TLD is reserved (RFC 2606): no one can own this email, so it can never be a registered
// Pix key, and a banking app that scans the QR code refuses to pay it.
const PIX_KEY = 'pagamento@modernstore.invalid';

export function sandboxSecret() {
  const secret = process.env.SANDBOX_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('SANDBOX_SECRET must be set in production');
  return 'dev-only-sandbox-secret';
}

const hmac = (data: string, key = sandboxSecret()) => createHmac('sha256', key).update(data).digest('base64url');
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}

const brandOf = (n: string) => (n.startsWith('4') ? 'visa' : /^5[1-5]/.test(n) ? 'mastercard' : 'unknown');

type TokenizeResult = { ok: true; token: string; brand: string; last4: string } | { ok: false; error: string };

// Stands in for the gateway's tokenization endpoint (in production this runs on the gateway's servers).
export function tokenizeCard(input: unknown, now = Date.now()): TokenizeResult {
  const { number, expiry, cvc, holder } = (input ?? {}) as Record<string, unknown>;
  if (typeof number !== 'string' || typeof expiry !== 'string' || typeof cvc !== 'string' || typeof holder !== 'string') {
    return { ok: false, error: 'Preencha todos os dados do cartão' };
  }
  const digits = number.replace(/\D/g, '');
  if (!holder.trim()) return { ok: false, error: 'Informe o nome impresso no cartão' };
  if (digits.length < 13 || digits.length > 19 || !luhn(digits)) return { ok: false, error: 'Número de cartão inválido' };
  const card = TEST_CARDS[digits];
  if (!card) return { ok: false, error: 'Use um dos cartões de teste: esta loja não aceita cartões reais' };

  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return { ok: false, error: 'Validade inválida (use MM/AA)' };
  const endOfMonth = Date.UTC(2000 + Number(m[2]), Number(m[1]), 1);
  if (endOfMonth <= now) return { ok: false, error: 'Cartão vencido' };
  if (!/^\d{3,4}$/.test(cvc)) return { ok: false, error: 'CVV inválido' };

  const payload = Buffer.from(JSON.stringify({ b: brandOf(digits), l4: digits.slice(-4), o: card.outcome, exp: now + TOKEN_TTL_MS })).toString('base64url');
  return { ok: true, token: `tok_sbx_${payload}.${hmac(payload)}`, brand: brandOf(digits), last4: digits.slice(-4) };
}

export function readCardToken(token: string, now = Date.now()) {
  const m = /^tok_sbx_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m || !safeEqual(m[2], hmac(m[1]))) return null;
  const data = JSON.parse(Buffer.from(m[1], 'base64url').toString()) as { b: string; l4: string; o: string; exp: number };
  return data.exp > now ? data : null;
}

// Header format borrowed from Stripe: the timestamp is signed with the body, so an old delivery can't be replayed.
export function signWebhook(body: string, nowSeconds = Math.floor(Date.now() / 1000), key = sandboxSecret()) {
  return `t=${nowSeconds},v1=${hmac(`${nowSeconds}.${body}`, key)}`;
}

export function verifyWebhook(body: string, header: string | null, nowSeconds = Math.floor(Date.now() / 1000), key = sandboxSecret()) {
  const m = /^t=(\d+),v1=([A-Za-z0-9_-]+)$/.exec(header ?? '');
  if (!m || Math.abs(nowSeconds - Number(m[1])) > WEBHOOK_TOLERANCE_S) return false;
  return safeEqual(m[2], hmac(`${m[1]}.${body}`, key));
}

export const SIGNATURE_HEADER = 'x-sandbox-signature';

// Plays the payer's bank: pays the Pix and has the "gateway" notify the store through its webhook.
export async function sendPixPaidWebhook(origin: string, providerRef: string, amountCents: number) {
  const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: 'pix.paid', data: { ref: providerRef, amount_cents: amountCents } });
  const res = await fetch(`${origin}/api/webhooks/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [SIGNATURE_HEADER]: signWebhook(body) },
    body,
    signal: AbortSignal.timeout(5000),
  });
  return res.status;
}

export const sandboxProvider: PaymentProvider = {
  name: 'sandbox',

  async createPix({ paymentId, amountCents }): Promise<PixCharge> {
    const providerRef = `pix_sbx_${randomUUID()}`;
    return {
      providerRef,
      pixCode: brCode({ key: PIX_KEY, amountCents, merchantName: 'ModernStore Sandbox', merchantCity: 'Sao Paulo', txid: paymentId }),
      expiresAt: new Date(Date.now() + PIX_TTL_MS),
    };
  },

  async chargeCard({ cardToken }): Promise<CardCharge> {
    const card = readCardToken(cardToken);
    const providerRef = `ch_sbx_${randomUUID()}`;
    if (!card) return { providerRef, status: 'failed', failureReason: 'invalid_token', brand: 'unknown', last4: '' };
    return card.o === 'approved'
      ? { providerRef, status: 'succeeded', brand: card.b, last4: card.l4 }
      : { providerRef, status: 'failed', failureReason: card.o, brand: card.b, last4: card.l4 };
  },

  // The sandbox keeps no state of its own; the store marks the payment cancelled and ignores late events for it.
  async cancel() {},

  parseWebhook(rawBody, headers): PaymentEvent | null {
    if (!verifyWebhook(rawBody, headers.get(SIGNATURE_HEADER))) return null;
    let event: unknown;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return null;
    }
    // JSON.parse also accepts "7" or "null": check the shape before indexing.
    const e = event as { id?: unknown; type?: unknown; data?: { ref?: unknown; amount_cents?: unknown } };
    if (typeof e?.id !== 'string' || e.type !== 'pix.paid' || typeof e.data?.ref !== 'string' || !Number.isInteger(e.data.amount_cents)) return null;
    return { eventId: e.id, providerRef: e.data.ref, status: 'succeeded', amountCents: e.data.amount_cents as number };
  },
};
