'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import OrderDetails from '@/components/OrderDetails';
import { listReceipts } from '@/lib/receipts';
import type { EmailStatus, Order } from '@/lib/types';

const EMAIL_NOTE: Record<EmailStatus, string> = {
  sent: 'A confirmation email is on its way.',
  not_configured: 'Email is not configured in this demo, so no confirmation was sent.',
  failed: 'We could not send the confirmation email, but the order itself is fine.',
};

type State = { kind: 'loading' } | { kind: 'missing' } | { kind: 'found'; order: Order; emailStatus?: EmailStatus };

export default function OrderPage({ params }: { params: { id: string } }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const receipt = listReceipts()[params.id];
    // Keys come from the server-issued id, but check anyway: never show one order under another's URL.
    if (receipt?.id === params.id) {
      setState({ kind: 'found', order: receipt, emailStatus: receipt.emailStatus });
      return;
    }
    // Not placed in this browser: it may be one of the fictional seed orders.
    fetch(`/api/orders/${encodeURIComponent(params.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((order: Order | null) => setState(order ? { kind: 'found', order } : { kind: 'missing' }))
      .catch(() => setState({ kind: 'missing' }));
  }, [params.id]);

  if (state.kind === 'loading') return <p className="text-gray-500">Loading order…</p>;
  if (state.kind === 'missing') {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mx-auto mt-3 max-w-md text-gray-600">
          Demo orders are kept only in the browser they were placed from. Open this link there, or place a new order.
        </p>
        <Link href="/products" className="mt-6 inline-block underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">{state.emailStatus ? 'Thanks for your order!' : 'Order'}</h1>
      <p className="mt-2 break-all text-sm text-gray-600">Order {state.order.id}</p>
      {state.emailStatus && (
        <p className="mt-4 rounded-md bg-gray-100 p-3 text-sm">
          {EMAIL_NOTE[state.emailStatus]} This was a simulated purchase: nothing was charged. The receipt is saved in this browser only.
        </p>
      )}
      <div className="mt-6">
        <OrderDetails order={state.order} />
      </div>
    </div>
  );
}
