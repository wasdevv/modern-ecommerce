// Integration tests against a real Postgres. Run with `npm run test:db` after `docker compose up -d`.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://modernstore:modernstore@localhost:5434/modernstore_test';

const { db } = await import('../db');
const { createOrder } = await import('../store');
const { tokenizeCard, signWebhook } = await import('./sandbox');
const { insertOrder, startPayment, handleWebhook, getOrderView, pendingPix } = await import('./service');

const sql = db();
let n = 0;

before(async () => {
  const { readFileSync } = await import('node:fs');
  await sql.unsafe(readFileSync(new URL('../../../db/schema.sql', import.meta.url), 'utf8'));
  await sql`TRUNCATE webhook_events, payments, orders`;
});
after(() => sql.end());

async function newOrder(email = 'ana@example.com') {
  const priced = createOrder({ name: 'Ana Souza', email, items: [{ productId: 'prod_001', quantity: 1 }] }, `ord_test_${++n}`, new Date());
  assert.ok(priced.ok);
  const saved = await insertOrder(priced.value, `key-${n}-${'x'.repeat(16)}`);
  assert.ok(saved.ok);
  return saved.id;
}

const cardToken = (number: string) => {
  const r = tokenizeCard({ number, expiry: '12/34', cvc: '123', holder: 'Ana' });
  assert.ok(r.ok);
  return r.token;
};

async function pixWebhook(ref: string, amountCents: number, eventId = `evt_${++n}`) {
  const body = JSON.stringify({ id: eventId, type: 'pix.paid', data: { ref, amount_cents: amountCents } });
  return handleWebhook(body, new Headers({ 'x-sandbox-signature': signWebhook(body) }));
}

const refOf = async (paymentId: string) => (await sql`SELECT provider_ref, amount_cents FROM payments WHERE id = ${paymentId}`)[0];

test('same Idempotency-Key returns the same order; reusing it for another buyer is refused', async () => {
  const priced = createOrder({ name: 'Ana', email: 'ana@example.com', items: [{ productId: 'prod_002', quantity: 1 }] }, 'ord_idem_a', new Date());
  assert.ok(priced.ok);
  const first = await insertOrder(priced.value, 'idem-key-0000000001');
  const retry = await insertOrder({ ...priced.value, id: 'ord_idem_b' }, 'idem-key-0000000001');
  assert.deepEqual([first.ok && first.id, retry.ok && retry.id], ['ord_idem_a', 'ord_idem_a']);
  const other = await insertOrder({ ...priced.value, id: 'ord_idem_c', email: 'bruno@example.com' }, 'idem-key-0000000001');
  assert.equal(other.ok ? 0 : other.status, 409);
});

test('approved card pays the order; declined card leaves it pending and retryable', async () => {
  const id = await newOrder();
  const declined = await startPayment(id, 'card', cardToken('4000000000000002'));
  assert.ok(declined.ok);
  assert.deepEqual([declined.payment.status, declined.payment.failureReason], ['failed', 'card_declined']);
  assert.equal((await getOrderView(id))!.status, 'pending');

  const approved = await startPayment(id, 'card', cardToken('4242424242424242'));
  assert.ok(approved.ok);
  assert.equal(approved.payment.status, 'succeeded');
  assert.equal(approved.payment.cardLast4, '4242');
  const view = (await getOrderView(id))!;
  assert.equal(view.status, 'paid');
  assert.equal(view.emailStatus, 'not_configured');

  const again = await startPayment(id, 'card', cardToken('4242424242424242'));
  assert.equal(again.ok ? 0 : again.status, 409, 'a paid order refuses new payments');
});

test('Pix is paid only through a signed webhook, exactly once', async () => {
  const id = await newOrder();
  const started = await startPayment(id, 'pix');
  assert.ok(started.ok);
  assert.equal(started.payment.status, 'pending');
  assert.ok(started.payment.pixCode?.startsWith('000201'));
  assert.ok(started.payment.pixQrSvg?.startsWith('<svg'));
  const { provider_ref, amount_cents } = await refOf(started.payment.id);

  const forged = JSON.stringify({ id: 'evt_forged', type: 'pix.paid', data: { ref: provider_ref, amount_cents } });
  assert.equal((await handleWebhook(forged, new Headers({ 'x-sandbox-signature': 't=1,v1=abc' }))).status, 401);

  const wrongAmount = await pixWebhook(provider_ref, amount_cents - 1);
  assert.equal(wrongAmount.body.ignored, 'amount mismatch');
  assert.equal((await getOrderView(id))!.status, 'pending');

  const paid = await pixWebhook(provider_ref, amount_cents, 'evt_pay_once');
  assert.equal(paid.body.applied, true);
  const replay = await pixWebhook(provider_ref, amount_cents, 'evt_pay_once');
  assert.equal(replay.body.duplicate, true);

  const view = (await getOrderView(id))!;
  assert.equal(view.status, 'paid');
  assert.equal(view.payment!.pixCode, null, 'code is no longer shown once paid');
});

test('a new attempt cancels the open Pix, so a late payment of the old code does not count', async () => {
  const id = await newOrder();
  const first = await startPayment(id, 'pix');
  const second = await startPayment(id, 'pix');
  assert.ok(first.ok && second.ok);
  const old = await refOf(first.payment.id);
  const late = await pixWebhook(old.provider_ref, old.amount_cents);
  assert.equal(late.body.applied, false);
  assert.equal((await getOrderView(id))!.status, 'pending');
  const [{ status }] = await sql`SELECT status FROM payments WHERE id = ${first.payment.id}`;
  assert.equal(status, 'cancelled');
});

test('an expired Pix cannot be paid and the order offers a new one', async () => {
  const id = await newOrder();
  const started = await startPayment(id, 'pix');
  assert.ok(started.ok);
  await sql`UPDATE payments SET expires_at = now() - interval '1 second' WHERE id = ${started.payment.id}`;

  const bank = await pendingPix(started.payment.id);
  assert.equal(bank.ok ? 0 : bank.status, 409);
  const view = (await getOrderView(id))!;
  assert.equal(view.payment!.status, 'expired');
  assert.equal(view.status, 'pending');

  const retry = await startPayment(id, 'pix');
  assert.ok(retry.ok && retry.payment.status === 'pending');
});

test('the database refuses a second successful payment for the same order', async () => {
  const id = await newOrder();
  const a = await startPayment(id, 'card', cardToken('4242424242424242'));
  assert.ok(a.ok);
  await assert.rejects(
    sql`INSERT INTO payments (id, order_id, provider, method, amount_cents, status) VALUES ('pay_dup', ${id}, 'sandbox', 'card', 1, 'succeeded')`,
    /payments_one_success_per_order/,
  );
});

test('concurrent payment attempts on one order leave exactly one pending Pix', async () => {
  const id = await newOrder();
  await Promise.all([startPayment(id, 'pix'), startPayment(id, 'pix'), startPayment(id, 'pix')]);
  const rows = await sql`SELECT status FROM payments WHERE order_id = ${id}`;
  assert.equal(rows.filter((r) => r.status === 'pending').length, 1);
  assert.equal(rows.filter((r) => r.status === 'cancelled').length, 2);
});
