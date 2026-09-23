'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import OrderDetails from '@/components/OrderDetails';
import { listReceipts } from '@/lib/receipts';
import type { EmailStatus, Order } from '@/lib/types';

const EMAIL_NOTE: Record<EmailStatus, string> = {
  sent: 'O email de confirmação está a caminho.',
  not_configured: 'O envio de email não está configurado nesta demo, então nenhuma confirmação foi enviada.',
  failed: 'Não conseguimos enviar o email de confirmação, mas o pedido está certo.',
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

  if (state.kind === 'loading') return <p className="text-gray-500">Carregando pedido…</p>;
  if (state.kind === 'missing') {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
        <p className="mx-auto mt-3 max-w-md text-gray-600">
          Pedidos da demo ficam salvos só no navegador em que foram feitos. Abra este link lá, ou faça um novo pedido.
        </p>
        <Link href="/products" className="mt-6 inline-block underline">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">{state.emailStatus ? 'Obrigado pelo pedido!' : 'Pedido'}</h1>
      <p className="mt-2 break-all text-sm text-gray-600">Pedido {state.order.id}</p>
      {state.emailStatus && (
        <p className="mt-4 rounded-md bg-gray-100 p-3 text-sm">
          {EMAIL_NOTE[state.emailStatus]} Esta foi uma compra simulada: nada foi cobrado. O recibo fica salvo só neste navegador.
        </p>
      )}
      <div className="mt-6">
        <OrderDetails order={state.order} />
      </div>
    </div>
  );
}
