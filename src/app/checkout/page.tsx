'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import Totals from '@/components/Totals';
import { getProduct } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import { taxFor } from '@/lib/limits';
import { saveReceipt } from '@/lib/receipts';
import { toItem, track } from '@/lib/tracking';
import type { Receipt } from '@/lib/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, hydrated, subtotalCents, clear } = useCart();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'placed'>('idle');
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const tracked = useRef(false);

  const items = lines.map((l) => toItem(getProduct(l.productId)!, l.quantity));

  useEffect(() => {
    if (!hydrated || tracked.current || lines.length === 0) return;
    tracked.current = true;
    track('begin_checkout', { items, value: subtotalCents / 100 });
  }, [hydrated, lines.length, items, subtotalCents]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (!hydrated) return <p className="text-gray-500">Loading…</p>;
  if (status === 'placed') return <p className="text-gray-500">Order placed, opening your receipt…</p>;
  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <Link href="/products" className="mt-6 inline-block underline">
          Browse products
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== 'idle') return;
    setStatus('submitting');
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          paymentMethod: form.get('paymentMethod'),
          items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error || 'The order could not be created.');
      const receipt = data as Receipt;
      saveReceipt(receipt);
      // Fired here, once, right after the server confirmed the order: a refresh of the receipt page can't repeat it.
      track('purchase', {
        transaction_id: receipt.id,
        value: receipt.totalCents / 100,
        tax: receipt.taxCents / 100,
        items: receipt.items.map((i) => ({ item_id: i.productId, item_name: i.productName, price: i.unitPriceCents / 100, quantity: i.quantity })),
      });
      setStatus('placed');
      clear();
      router.push(`/order/${receipt.id}`);
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Network error. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold">Checkout</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-white p-6">
          {error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Full name</span>
            <input name="name" required maxLength={100} autoComplete="name" className="w-full rounded-md border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input name="email" type="email" required maxLength={254} autoComplete="email" className="w-full rounded-md border px-3 py-2" />
          </label>
          <fieldset className="text-sm">
            <legend className="mb-1 font-medium">Payment method</legend>
            <div className="flex flex-wrap gap-4">
              {[
                ['pix', 'Pix'],
                ['card', 'Credit card'],
                ['boleto', 'Boleto'],
              ].map(([value, label], i) => (
                <label key={value} className="flex items-center gap-2">
                  <input type="radio" name="paymentMethod" value={value} defaultChecked={i === 0} /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Simulated purchase.</strong> No payment details are collected and nothing will be charged.
          </p>
          <button
            disabled={status === 'submitting'}
            className="w-full rounded-md bg-gray-900 py-3 font-semibold text-white hover:bg-gray-700 disabled:cursor-wait disabled:bg-gray-500"
          >
            {status === 'submitting' ? 'Placing order…' : 'Place demo order'}
          </button>
        </form>
        <aside className="h-fit rounded-lg border bg-white p-6">
          <h2 className="mb-4 font-bold">Order summary</h2>
          <ul className="mb-4 space-y-2 border-b pb-4 text-sm">
            {lines.map((l) => {
              const p = getProduct(l.productId)!;
              return (
                <li key={l.productId} className="flex justify-between gap-4">
                  <span>
                    {p.name} × {l.quantity}
                  </span>
                  <span>{formatBRL(p.priceCents * l.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <Totals subtotalCents={subtotalCents} taxCents={taxFor(subtotalCents)} />
          <p className="mt-3 text-xs text-gray-500">Final prices are confirmed by the server.</p>
        </aside>
      </div>
    </>
  );
}
