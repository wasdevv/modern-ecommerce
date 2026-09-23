import { track } from './tracking';
import type { OrderItem } from './types';

// Browser-side bookkeeping for analytics only; order and payment state live in the database.
const MINE = 'my_orders';
const TRACKED = 'tracked_purchases';

function read(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function add(key: string, id: string) {
  try {
    localStorage.setItem(key, JSON.stringify([...read(key), id].slice(-50)));
  } catch {}
}

export const rememberOrder = (id: string) => add(MINE, id);

// `purchase` fires once per order, only in the browser that placed it, and only after payment is confirmed:
// a reload, a shared receipt link or a Pix confirmed later can't count the sale twice.
export function trackPurchaseOnce(order: { id: string; totalCents: number; taxCents: number; items: OrderItem[] }) {
  if (!read(MINE).includes(order.id) || read(TRACKED).includes(order.id)) return;
  add(TRACKED, order.id);
  track('purchase', {
    transaction_id: order.id,
    value: order.totalCents / 100,
    tax: order.taxCents / 100,
    items: order.items.map((i) => ({ item_id: i.productId, item_name: i.productName, price: i.unitPriceCents / 100, quantity: i.quantity })),
  });
}

// crypto.randomUUID needs a secure context; plain http on a LAN address isn't one.
export function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
