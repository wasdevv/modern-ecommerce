'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useCart } from '@/components/CartProvider';
import Totals from '@/components/Totals';
import { getProduct } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import { MAX_QUANTITY, taxFor } from '@/lib/limits';
import { toItem, track } from '@/lib/tracking';

export default function CartPage() {
  const { lines, hydrated, subtotalCents, setQuantity, remove } = useCart();
  const tracked = useRef(false);

  useEffect(() => {
    if (!hydrated || tracked.current || lines.length === 0) return;
    tracked.current = true;
    track('view_cart', { items: lines.map((l) => toItem(getProduct(l.productId)!, l.quantity)), value: subtotalCents / 100 });
  }, [hydrated, lines, subtotalCents]);

  if (!hydrated) return <p className="text-gray-500">Loading cart…</p>;

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <Link href="/products" className="mt-6 inline-block rounded-md bg-gray-900 px-5 py-2.5 font-semibold text-white">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <ul className="divide-y rounded-lg border bg-white">
          {lines.map((line) => {
            const product = getProduct(line.productId)!;
            return (
              <li key={line.productId} className="flex gap-4 p-4">
                <Image src={product.image} alt="" width={96} height={72} className="rounded object-cover" />
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Link href={`/products/${product.id}`} className="font-semibold hover:underline">
                      {product.name}
                    </Link>
                    <p className="text-sm text-gray-600">{formatBRL(product.priceCents)} each</p>
                    {!product.inStock && <p className="text-sm text-red-700">No longer available — remove it to check out.</p>}
                  </div>
                  <label className="text-sm">
                    <span className="sr-only">Quantity of {product.name}</span>
                    <select value={line.quantity} onChange={(e) => setQuantity(product.id, Number(e.target.value))} className="rounded-md border px-2 py-1">
                      {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <p className="w-28 font-semibold sm:text-right">{formatBRL(product.priceCents * line.quantity)}</p>
                  <button onClick={() => remove(product.id)} className="text-sm text-red-700 hover:underline">
                    Remove<span className="sr-only"> {product.name}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="h-fit rounded-lg border bg-white p-6">
          <Totals subtotalCents={subtotalCents} taxCents={taxFor(subtotalCents)} />
          <Link href="/checkout" className="mt-6 block rounded-md bg-gray-900 py-3 text-center font-semibold text-white hover:bg-gray-700">
            Checkout
          </Link>
        </aside>
      </div>
    </>
  );
}
