import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signSession, verifySession, SESSION_SECONDS } from './admin-auth';
import { confirmationHtml } from './email';
import { taxFor } from './limits';
import { createOrder, customers, getAnalytics, meta, parseProductQuery, products, queryProducts, seedOrders } from './store';

const validBody = { name: 'Ana', email: 'ana@example.com', paymentMethod: 'pix', items: [{ productId: 'prod_001', quantity: 2 }] };
const now = new Date('2026-09-01T12:00:00Z');

test('seed data meets the minimum sizes and has unique ids', () => {
  assert.ok(products.length >= 50 && customers.length >= 100 && seedOrders.length >= 200);
  for (const list of [products, customers, seedOrders]) assert.equal(new Set(list.map((x) => x.id)).size, list.length);
  assert.equal(new Set(customers.map((c) => c.email)).size, customers.length);
  assert.ok(customers.every((c) => c.email.endsWith('@example.com')));
});

test('every seed order references real rows and its money adds up', () => {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productIds = new Set(products.map((p) => p.id));
  let previous = '';
  for (const o of seedOrders) {
    const customer = customerById.get(o.customerId!);
    assert.ok(customer, `${o.id} customer`);
    assert.equal(o.email, customer.email);
    assert.ok(customer.createdAt <= o.createdAt.slice(0, 10), `${o.id} placed before signup`);
    assert.ok(o.createdAt >= previous, 'orders sorted by date');
    assert.ok(o.createdAt.slice(0, 10) >= meta.periodStart && o.createdAt.slice(0, 10) <= meta.periodEnd);
    previous = o.createdAt;
    for (const i of o.items) {
      assert.ok(productIds.has(i.productId));
      assert.equal(i.totalCents, i.unitPriceCents * i.quantity);
    }
    assert.equal(o.subtotalCents, o.items.reduce((s, i) => s + i.totalCents, 0));
    assert.equal(o.taxCents, taxFor(o.subtotalCents));
    assert.equal(o.totalCents, o.subtotalCents + o.taxCents);
  }
});

test('every product image exists on disk', async () => {
  const { existsSync } = await import('node:fs');
  for (const p of products) assert.ok(existsSync(`public${p.image}`), p.image);
});

test('analytics is derived from the orders', () => {
  const a = getAnalytics();
  const paid = seedOrders.filter((o) => o.status !== 'refunded');
  assert.equal(a.orderCount, paid.length);
  assert.equal(a.revenueCents, paid.reduce((s, o) => s + o.totalCents, 0));
  assert.equal(a.revenueByMonth.reduce((s, m) => s + m.cents, 0), a.revenueCents);
  assert.equal(a.conversionRate, paid.length / meta.simulatedSessions);
});

test('product query combines filters, validates input and paginates stably', () => {
  const q = parseProductQuery({ category: 'ebooks', search: 'TYPESCRIPT', sort: 'price_asc' });
  assert.ok(q.ok);
  const r = queryProducts(q.value);
  assert.ok(r.total >= 1 && r.items.every((p) => p.category === 'ebooks' && /typescript/i.test(p.name + p.description)));

  for (const bad of [{ category: 'shoes' }, { sort: 'random' }, { page: '0' }, { page: '-1' }, { pageSize: 'abc' }, { pageSize: '1.5' }]) {
    assert.equal(parseProductQuery(bad).ok, false, JSON.stringify(bad));
  }

  const all = parseProductQuery({ pageSize: '60' });
  const paged = [1, 2, 3, 4, 5].flatMap((page) => queryProducts({ sort: 'featured', page, pageSize: 12 }).items.map((p) => p.id));
  assert.ok(all.ok);
  assert.deepEqual(paged, queryProducts(all.value).items.map((p) => p.id));
});

test('createOrder prices from the catalog and ignores client-sent money', () => {
  const r = createOrder({ ...validBody, total: 1, items: [{ productId: 'prod_001', quantity: 2, price: 0.01 }] }, 'ord_x', now);
  assert.ok(r.ok);
  const price = products.find((p) => p.id === 'prod_001')!.priceCents;
  assert.equal(r.value.subtotalCents, price * 2);
  assert.equal(r.value.totalCents, price * 2 + Math.round(price * 2 * 0.18));
  assert.equal(r.value.customerId, null);
});

test('createOrder rejects invalid input with a predictable status', () => {
  const unavailable = products.find((p) => !p.inStock)!;
  const cases: [unknown, number][] = [
    [null, 400],
    [[], 400],
    [{ ...validBody, name: '  ' }, 400],
    [{ ...validBody, email: 'nope' }, 400],
    [{ ...validBody, paymentMethod: 'crypto' }, 400],
    [{ ...validBody, items: [] }, 400],
    [{ ...validBody, items: [{ productId: 'prod_001', quantity: 0 }] }, 400],
    [{ ...validBody, items: [{ productId: 'prod_001', quantity: 1.5 }] }, 400],
    [{ ...validBody, items: [{ productId: 'prod_001', quantity: 11 }] }, 400],
    [{ ...validBody, items: [{ productId: 'prod_001', quantity: '1' }] }, 400],
    [{ ...validBody, items: [{ productId: 'prod_001', quantity: 1 }, { productId: 'prod_001', quantity: 1 }] }, 400],
    [{ ...validBody, items: Array.from({ length: 21 }, (_, i) => ({ productId: products[i].id, quantity: 1 })) }, 400],
    [{ ...validBody, items: [{ productId: 'prod_999', quantity: 1 }] }, 404],
    [{ ...validBody, items: [{ productId: unavailable.id, quantity: 1 }] }, 409],
  ];
  for (const [body, status] of cases) {
    const r = createOrder(body, 'ord_x', now);
    assert.equal(r.ok ? 201 : r.status, status, JSON.stringify(body));
  }
});

test('admin session tokens expire and cannot be forged', () => {
  const key = 'k'.repeat(32);
  const token = signSession(1000, key);
  assert.ok(verifySession(token, 1000, key));
  assert.ok(!verifySession(token, 1001 + SESSION_SECONDS, key), 'expired');
  assert.ok(!verifySession(token, 1000, 'x'.repeat(32)), 'other key');
  const [, sig] = token.split('.');
  assert.ok(!verifySession(`${99999999}.${sig}`, 1000, key), 'extended expiry');
  assert.ok(!verifySession(undefined, 1000, key));
  assert.ok(!verifySession('garbage', 1000, key));
});

test('confirmation email escapes customer input', () => {
  const r = createOrder({ ...validBody, name: '<script>alert(1)</script>' }, 'ord_x', now);
  assert.ok(r.ok);
  const html = confirmationHtml(r.value);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
