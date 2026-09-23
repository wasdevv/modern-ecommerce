import ordersJson from '@/data/orders.json';
import customersJson from '@/data/customers.json';
import metaJson from '@/data/meta.json';
import {
  CATEGORIES,
  PAYMENT_METHODS,
  type Category,
  type Customer,
  type DatasetMeta,
  type Order,
  type PaymentMethod,
  type Product,
} from './types';
import { getProduct, products } from './catalog';
import { MAX_LINES, MAX_QUANTITY, taxFor } from './limits';

export { getProduct, products };

export const seedOrders = ordersJson as Order[];
export const customers = customersJson as Customer[];
export const meta = metaJson as DatasetMeta;


export const getSeedOrder = (id: string) => seedOrders.find((o) => o.id === id);

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string) => ({ ok: false, status, error }) as const;

export const SORTS = ['featured', 'price_asc', 'price_desc', 'newest', 'rating'] as const;
export type Sort = (typeof SORTS)[number];

export interface ProductQuery {
  category?: Category;
  search?: string;
  sort: Sort;
  page: number;
  pageSize: number;
}

type Params = Record<string, string | string[] | undefined>;

function positiveInt(raw: string | undefined, fallback: number, max: number) {
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= max ? n : null;
}

export function parseProductQuery(params: Params): Result<ProductQuery> {
  const get = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const category = get('category') || undefined;
  if (category && !CATEGORIES.includes(category as Category)) return fail(400, 'Unknown category');
  const sort = get('sort') || 'featured';
  if (!SORTS.includes(sort as Sort)) return fail(400, 'Unknown sort');
  const page = positiveInt(get('page'), 1, 1000);
  const pageSize = positiveInt(get('pageSize'), 12, 60);
  if (page === null || pageSize === null) return fail(400, 'page and pageSize must be positive integers');
  const search = get('search')?.trim().slice(0, 100).toLowerCase() || undefined;
  return { ok: true, value: { category: category as Category | undefined, search, sort: sort as Sort, page, pageSize } };
}

const comparators: Record<Sort, (a: Product, b: Product) => number> = {
  featured: (a, b) => b.reviewCount - a.reviewCount,
  price_asc: (a, b) => a.priceCents - b.priceCents,
  price_desc: (a, b) => b.priceCents - a.priceCents,
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  rating: (a, b) => b.rating - a.rating,
};

export function queryProducts(q: ProductQuery) {
  const matches = products
    .filter((p) => !q.category || p.category === q.category)
    .filter((p) => !q.search || p.name.toLowerCase().includes(q.search) || p.description.toLowerCase().includes(q.search))
    .sort((a, b) => comparators[q.sort](a, b) || a.id.localeCompare(b.id));
  const start = (q.page - 1) * q.pageSize;
  return {
    items: matches.slice(start, start + q.pageSize),
    total: matches.length,
    page: q.page,
    pageSize: q.pageSize,
    pageCount: Math.max(1, Math.ceil(matches.length / q.pageSize)),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The browser sends only product ids and quantities. Names, prices and totals come from the catalog,
// so a tampered request can change what is bought, never what it costs.
export function createOrder(body: unknown, id: string, now: Date): Result<Order> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail(400, 'Body must be a JSON object');
  const { name, email, paymentMethod, items } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) return fail(400, 'Name is required (max 100 characters)');
  if (typeof email !== 'string' || email.length > 254 || !EMAIL.test(email.trim())) return fail(400, 'A valid email is required');
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) return fail(400, 'Unknown payment method');
  if (!Array.isArray(items) || items.length === 0) return fail(400, 'Cart is empty');
  if (items.length > MAX_LINES) return fail(400, `At most ${MAX_LINES} different products per order`);

  const seen = new Set<string>();
  const lines: Order['items'] = [];
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) return fail(400, 'Invalid item');
    const { productId, quantity } = raw as Record<string, unknown>;
    if (typeof productId !== 'string') return fail(400, 'Invalid item');
    if (seen.has(productId)) return fail(400, `Duplicate item ${productId}`);
    seen.add(productId);
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) {
      return fail(400, `Quantity must be an integer from 1 to ${MAX_QUANTITY}`);
    }
    const product = getProduct(productId);
    if (!product) return fail(404, `Product ${productId} not found`);
    if (!product.inStock) return fail(409, `${product.name} is not available`);
    const qty = quantity as number;
    lines.push({ productId, productName: product.name, quantity: qty, unitPriceCents: product.priceCents, totalCents: product.priceCents * qty });
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const taxCents = taxFor(subtotalCents);
  return {
    ok: true,
    value: {
      id,
      customerId: null,
      name: name.trim(),
      email: email.trim(),
      items: lines,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      status: 'pending',
      paymentMethod: paymentMethod as PaymentMethod,
      createdAt: now.toISOString(),
    },
  };
}

// Everything the dashboard shows is derived from the orders, so the numbers always add up.
export function getAnalytics(orders: Order[] = seedOrders) {
  const paid = orders.filter((o) => o.status !== 'refunded');
  const revenueCents = paid.reduce((sum, o) => sum + o.totalCents, 0);
  const sales = new Map<string, { productId: string; name: string; units: number; revenueCents: number }>();
  for (const order of paid) {
    for (const item of order.items) {
      const row = sales.get(item.productId) ?? { productId: item.productId, name: item.productName, units: 0, revenueCents: 0 };
      row.units += item.quantity;
      row.revenueCents += item.totalCents;
      sales.set(item.productId, row);
    }
  }
  const byMonth = new Map<string, number>();
  for (const o of paid) byMonth.set(o.createdAt.slice(0, 7), (byMonth.get(o.createdAt.slice(0, 7)) ?? 0) + o.totalCents);

  return {
    period: { start: meta.periodStart, end: meta.periodEnd },
    revenueCents,
    orderCount: paid.length,
    refundedCount: orders.length - paid.length,
    averageOrderCents: paid.length ? Math.round(revenueCents / paid.length) : 0,
    customerCount: new Set(paid.map((o) => o.customerId)).size,
    simulatedSessions: meta.simulatedSessions,
    conversionRate: paid.length / meta.simulatedSessions,
    topProducts: [...sales.values()].sort((a, b) => b.revenueCents - a.revenueCents || a.productId.localeCompare(b.productId)).slice(0, 5),
    revenueByMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, cents]) => ({ month, cents })),
  };
}
