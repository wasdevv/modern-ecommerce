import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import type postgres from 'postgres';
import { db } from '../db';
import { sendConfirmation } from '../email';
import type { EmailStatus, OrderItem, PricedOrder } from '../types';
import { sandboxProvider } from './sandbox';
import type { PaymentProvider, PaymentStatus } from './types';

export function provider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER || 'sandbox';
  if (name === 'sandbox') return sandboxProvider;
  throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
}

export type CheckoutMethod = 'pix' | 'card';

type Fail = { ok: false; status: number; error: string };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

interface OrderRow {
  id: string;
  idempotency_key: string;
  name: string;
  email: string;
  items: OrderItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: 'pending' | 'paid';
  email_status: EmailStatus | null;
  created_at: Date;
  paid_at: Date | null;
}

interface PaymentRow {
  id: string;
  order_id: string;
  provider: string;
  method: CheckoutMethod;
  amount_cents: number;
  status: PaymentStatus;
  provider_ref: string | null;
  failure_reason: string | null;
  pix_code: string | null;
  card_brand: string | null;
  card_last4: string | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface PaymentView {
  id: string;
  method: CheckoutMethod;
  status: PaymentStatus;
  failureReason: string | null;
  pixCode: string | null;
  pixQrSvg: string | null;
  expiresAt: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

export interface OrderView {
  id: string;
  name: string;
  email: string;
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  status: 'pending' | 'paid' | 'completed' | 'refunded';
  createdAt: string;
  paidAt: string | null;
  emailStatus: EmailStatus | null;
  // Seed orders are fictional history; they have a method but no payment rows.
  seed: boolean;
  paymentMethod: string | null;
  payment: PaymentView | null;
}

// Persists an order that store.createOrder already validated and priced.
// Retrying with the same idempotency key returns the first order instead of creating a duplicate.
export async function insertOrder(order: PricedOrder, idempotencyKey: string): Promise<{ ok: true; id: string } | Fail> {
  const sql = db();
  const [created] = await sql<{ id: string }[]>`
    INSERT INTO orders (id, idempotency_key, name, email, items, subtotal_cents, tax_cents, total_cents)
    VALUES (${order.id}, ${idempotencyKey}, ${order.name}, ${order.email}, ${sql.json(order.items as unknown as postgres.JSONValue)},
            ${order.subtotalCents}, ${order.taxCents}, ${order.totalCents})
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id`;
  if (created) return { ok: true, id: created.id };

  const [existing] = await sql<Pick<OrderRow, 'id' | 'email' | 'total_cents'>[]>`
    SELECT id, email, total_cents FROM orders WHERE idempotency_key = ${idempotencyKey}`;
  // Same key, different request: a client bug, not a retry. Refuse rather than return the wrong order.
  if (existing.email !== order.email || existing.total_cents !== order.totalCents) return fail(409, 'Idempotency-Key já usada em outro pedido');
  return { ok: true, id: existing.id };
}

// Moves a pending payment to its final state and, on success, marks the order paid.
// Every path that learns a result (synchronous card charge, webhook, expiry) goes through here,
// so a payment can only leave "pending" once.
async function settle(sql: postgres.TransactionSql, paymentId: string, to: Exclude<PaymentStatus, 'pending'>, failureReason: string | null = null) {
  const [payment] = await sql<PaymentRow[]>`SELECT * FROM payments WHERE id = ${paymentId} FOR UPDATE`;
  if (!payment || payment.status !== 'pending') return { changed: false as const, payment };
  await sql`UPDATE payments SET status = ${to}, failure_reason = ${failureReason}, updated_at = now() WHERE id = ${paymentId}`;
  if (to === 'succeeded') await sql`UPDATE orders SET status = 'paid', paid_at = now() WHERE id = ${payment.order_id} AND status = 'pending'`;
  return { changed: true as const, payment };
}

async function afterPaid(orderId: string) {
  const sql = db();
  const [row] = await sql<OrderRow[]>`SELECT * FROM orders WHERE id = ${orderId}`;
  const emailStatus = await sendConfirmation(toOrder(row));
  await sql`UPDATE orders SET email_status = ${emailStatus} WHERE id = ${orderId}`;
}

const toOrder = (row: OrderRow): PricedOrder => ({
  id: row.id,
  name: row.name,
  email: row.email,
  items: row.items,
  subtotalCents: row.subtotal_cents,
  taxCents: row.tax_cents,
  totalCents: row.total_cents,
  createdAt: row.created_at.toISOString(),
});

export async function startPayment(orderId: string, method: CheckoutMethod, cardToken?: string): Promise<{ ok: true; payment: PaymentView } | Fail> {
  const sql = db();
  const gateway = provider();
  const paymentId = `pay_${randomUUID()}`;

  const opened = await sql.begin(async (tx) => {
    // Lock the order so two tabs can't open competing payments at the same time.
    const [order] = await tx<OrderRow[]>`SELECT * FROM orders WHERE id = ${orderId} FOR UPDATE`;
    if (!order) return fail(404, 'Pedido não encontrado');
    if (order.status === 'paid') return fail(409, 'Este pedido já foi pago');
    // A new attempt supersedes any open Pix, so the order can't end up paid twice.
    const stale = await tx<PaymentRow[]>`SELECT * FROM payments WHERE order_id = ${orderId} AND status = 'pending'`;
    for (const p of stale) await settle(tx, p.id, 'cancelled', 'superseded');
    await tx`INSERT INTO payments (id, order_id, provider, method, amount_cents, status)
             VALUES (${paymentId}, ${orderId}, ${gateway.name}, ${method}, ${order.total_cents}, 'pending')`;
    return { ok: true as const, amountCents: order.total_cents, stale };
  });
  if (!opened.ok) return opened;
  for (const p of opened.stale) if (p.provider_ref) await gateway.cancel(p.provider_ref);

  if (method === 'pix') {
    const pix = await gateway.createPix({ paymentId, amountCents: opened.amountCents });
    await sql`UPDATE payments SET provider_ref = ${pix.providerRef}, pix_code = ${pix.pixCode}, expires_at = ${pix.expiresAt}, updated_at = now()
              WHERE id = ${paymentId}`;
  } else {
    const charge = await gateway.chargeCard({ paymentId, amountCents: opened.amountCents, cardToken: cardToken ?? '' });
    await sql`UPDATE payments SET provider_ref = ${charge.providerRef}, card_brand = ${charge.brand}, card_last4 = ${charge.last4} WHERE id = ${paymentId}`;
    const result = await sql.begin((tx) => settle(tx, paymentId, charge.status, charge.failureReason ?? null));
    if (result.changed && charge.status === 'succeeded') await afterPaid(orderId);
  }

  const [row] = await sql<PaymentRow[]>`SELECT * FROM payments WHERE id = ${paymentId}`;
  return { ok: true, payment: await toPaymentView(row) };
}

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
  const gateway = provider();
  const event = gateway.parseWebhook(rawBody, headers);
  if (!event) return { status: 401, body: { error: 'invalid signature' } };

  const sql = db();
  // Recording the event and applying it share one transaction: if applying fails, the event isn't
  // marked as seen and the provider's retry gets processed.
  const outcome = await sql.begin(async (tx) => {
    const [fresh] = await tx`INSERT INTO webhook_events (id, provider) VALUES (${event.eventId}, ${gateway.name}) ON CONFLICT DO NOTHING RETURNING id`;
    if (!fresh) return { duplicate: true };
    const [payment] = await tx<PaymentRow[]>`SELECT * FROM payments WHERE provider_ref = ${event.providerRef} AND provider = ${gateway.name}`;
    if (!payment) return { ignored: 'unknown payment' };
    if (payment.amount_cents !== event.amountCents) {
      console.error('webhook amount mismatch', event, payment.amount_cents);
      return { ignored: 'amount mismatch' };
    }
    const result = await settle(tx, payment.id, event.status);
    // A Pix paid after being cancelled or expired would need a refund in a real integration.
    if (!result.changed) console.warn('webhook for a payment that is no longer pending', payment.id, payment.status);
    return { applied: result.changed, orderId: payment.order_id, paid: result.changed && event.status === 'succeeded' };
  });

  if ('paid' in outcome && outcome.paid) await afterPaid(outcome.orderId);
  return { status: 200, body: { received: true, ...outcome } };
}

// Called before the sandbox "bank" pays a Pix: an expired code can't be paid, as in real Pix.
export async function pendingPix(paymentId: string) {
  await expireIfDue(paymentId);
  const [row] = await db()<PaymentRow[]>`SELECT * FROM payments WHERE id = ${paymentId}`;
  if (!row || row.method !== 'pix') return fail(404, 'Pagamento Pix não encontrado');
  if (row.status !== 'pending') return fail(409, row.status === 'expired' ? 'Este Pix expirou' : 'Este Pix não está mais aguardando pagamento');
  return { ok: true as const, providerRef: row.provider_ref!, amountCents: row.amount_cents };
}

// Expiry is applied lazily on read; no scheduler needed.
async function expireIfDue(paymentId: string) {
  const sql = db();
  await sql.begin(async (tx) => {
    const [row] = await tx<PaymentRow[]>`SELECT status, expires_at FROM payments WHERE id = ${paymentId}`;
    if (row?.status === 'pending' && row.expires_at && row.expires_at.getTime() <= Date.now()) await settle(tx, paymentId, 'expired');
  });
}

async function toPaymentView(row: PaymentRow): Promise<PaymentView> {
  const showPix = row.status === 'pending' && row.pix_code;
  return {
    id: row.id,
    method: row.method,
    status: row.status,
    failureReason: row.failure_reason,
    pixCode: showPix ? row.pix_code : null,
    pixQrSvg: showPix ? await QRCode.toString(row.pix_code!, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) : null,
    expiresAt: row.expires_at?.toISOString() ?? null,
    cardBrand: row.card_brand,
    cardLast4: row.card_last4,
  };
}

export async function getOrderView(orderId: string): Promise<OrderView | null> {
  const sql = db();
  const [order] = await sql<OrderRow[]>`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!order) return null;
  let [payment] = await sql<PaymentRow[]>`SELECT * FROM payments WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 1`;
  if (payment?.status === 'pending' && payment.expires_at && payment.expires_at.getTime() <= Date.now()) {
    await expireIfDue(payment.id);
    [payment] = await sql<PaymentRow[]>`SELECT * FROM payments WHERE id = ${payment.id}`;
  }
  return {
    id: order.id,
    name: order.name,
    email: order.email,
    items: order.items,
    subtotalCents: order.subtotal_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    status: order.status,
    createdAt: order.created_at.toISOString(),
    paidAt: order.paid_at?.toISOString() ?? null,
    emailStatus: order.email_status,
    seed: false,
    paymentMethod: payment?.method ?? null,
    payment: payment ? await toPaymentView(payment) : null,
  };
}

export interface AdminOrderRow {
  id: string;
  name: string;
  email: string;
  total_cents: number;
  status: 'pending' | 'paid';
  created_at: Date;
  payment_method: string | null;
  payment_status: PaymentStatus | null;
}

export async function listStoreOrders(limit = 50) {
  return db()<AdminOrderRow[]>`
    SELECT o.id, o.name, o.email, o.total_cents, o.status, o.created_at, p.method AS payment_method, p.status AS payment_status
    FROM orders o
    LEFT JOIN LATERAL (SELECT method, status FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) p ON true
    ORDER BY o.created_at DESC
    LIMIT ${limit}`;
}
