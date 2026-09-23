'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CheckoutShell from '@/components/CheckoutShell';
import { CheckIcon } from '@/components/Icons';
import OrderSummary from '@/components/OrderSummary';
import { formatDate } from '@/lib/format';
import { listReceipts } from '@/lib/receipts';
import { PAYMENT_LABELS, STATUS_LABELS, type EmailStatus, type Order } from '@/lib/types';

const EMAIL_NOTE: Record<EmailStatus, string> = {
  sent: 'Você vai receber um email de confirmação.',
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

  if (state.kind === 'loading') return <p className="px-5 py-16 text-center text-[#707070]">Carregando pedido…</p>;
  if (state.kind === 'missing') {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="co-h2">Pedido não encontrado</h1>
        <p className="mt-3 text-[#707070]">Pedidos da demo ficam salvos só no navegador em que foram feitos. Abra este link lá, ou faça um novo pedido.</p>
        <Link href="/products" className="mt-6 inline-block text-checkout underline">
          Continuar comprando
        </Link>
      </div>
    );
  }

  const { order, emailStatus } = state;
  const firstName = order.name.split(' ')[0];

  return (
    <CheckoutShell
      totalCents={order.totalCents}
      summary={
        <OrderSummary
          lines={order.items.map((i) => ({ productId: i.productId, name: i.productName, quantity: i.quantity, totalCents: i.totalCents }))}
          subtotalCents={order.subtotalCents}
          taxCents={order.taxCents}
        />
      }
    >
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-checkout text-checkout">
          <CheckIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="break-all text-[#707070]">Pedido {order.id}</p>
          <h1 className="co-h2">{emailStatus ? `Obrigado, ${firstName}` : `Pedido de ${firstName}`}</h1>
        </div>
      </div>

      <section className="mt-6 rounded-[5px] border border-checkout-line p-5">
        <h2 className="text-[17px] font-semibold">{emailStatus ? 'Seu pedido foi recebido' : STATUS_LABELS[order.status]}</h2>
        <p className="mt-2 text-[#707070]">
          {emailStatus ? `${EMAIL_NOTE[emailStatus]} Esta foi uma compra simulada: nada foi cobrado, e o recibo fica salvo só neste navegador.` : 'Pedido fictício do conjunto de dados da demo.'}
        </p>
      </section>

      <section className="mt-4 rounded-[5px] border border-checkout-line p-5">
        <h2 className="text-[17px] font-semibold">Detalhes do pedido</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Contato</dt>
            <dd className="mt-1 break-all text-[#707070]">{order.email}</dd>
          </div>
          <div>
            <dt className="font-semibold">Forma de pagamento</dt>
            <dd className="mt-1 text-[#707070]">{PAYMENT_LABELS[order.paymentMethod]}</dd>
          </div>
          <div>
            <dt className="font-semibold">Data</dt>
            <dd className="mt-1 text-[#707070]">{formatDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="font-semibold">Status</dt>
            <dd className="mt-1 text-[#707070]">{STATUS_LABELS[order.status]}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
        <p className="text-[#707070]">Dúvidas? Esta é uma loja de portfólio.</p>
        <Link href="/products" className="flex h-[56px] items-center rounded-[5px] bg-checkout px-6 text-[15px] font-semibold text-white hover:bg-checkout-dark">
          Continuar comprando
        </Link>
      </div>
    </CheckoutShell>
  );
}
