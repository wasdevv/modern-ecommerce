'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import CheckoutShell from '@/components/CheckoutShell';
import { CheckIcon } from '@/components/Icons';
import OrderSummary from '@/components/OrderSummary';
import { formatDate } from '@/lib/format';
import { failureMessage } from '@/lib/payments/labels';
import type { OrderView } from '@/lib/payments/service';
import { trackPurchaseOnce } from '@/lib/purchase';
import { PAYMENT_LABELS, STATUS_LABELS, type EmailStatus, type PaymentMethod } from '@/lib/types';

const EMAIL_NOTE: Record<EmailStatus, string> = {
  sent: 'Enviamos a confirmação para o seu email.',
  not_configured: 'O envio de email não está configurado nesta demo, então nenhuma confirmação foi enviada.',
  failed: 'Não conseguimos enviar o email de confirmação, mas o pagamento está confirmado.',
};
const POLL_MS = 3000;

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const s = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function PixPanel({ order, onChange }: { order: OrderView; onChange: () => void }) {
  const payment = order.payment!;
  const left = useCountdown(payment.expiresAt);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const simulate = async () => {
    setBusy(true);
    setError('');
    try {
      await post(`/api/payments/sandbox/pix/${payment.id}/pay`);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao simular o pagamento');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-[5px] border border-checkout-line p-5">
      <h2 className="text-[17px] font-semibold">Pague com Pix para concluir</h2>
      <p className="mt-1 text-[#707070]">
        Expira em <span className="font-mono text-[#333]" aria-live="off">{left}</span>. Esta página atualiza sozinha quando o pagamento for confirmado.
      </p>
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* The SVG is generated server-side from our own BR Code string. */}
        <div className="h-[180px] w-[180px] shrink-0 rounded border border-checkout-line p-2" role="img" aria-label="QR code do Pix" dangerouslySetInnerHTML={{ __html: payment.pixQrSvg ?? '' }} />
        <div className="w-full min-w-0">
          <label htmlFor="pix-code" className="text-[13px] font-semibold">
            Pix copia e cola
          </label>
          <textarea id="pix-code" readOnly value={payment.pixCode ?? ''} rows={4} className="mt-1 w-full resize-none break-all rounded-[5px] border border-checkout-line bg-checkout-panel p-2 font-mono text-[11px]" />
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(payment.pixCode ?? '').then(() => setCopied(true))}
            className="mt-2 h-11 w-full rounded-[5px] border border-checkout text-checkout hover:bg-[#f0f5ff]"
          >
            {copied ? 'Código copiado' : 'Copiar código'}
          </button>
        </div>
      </div>
      <div className="mt-5 rounded-[5px] border border-dashed border-[#c9c9c9] p-4">
        <p className="font-semibold">Sandbox</p>
        <p className="mt-1 text-[#707070]">Este código usa uma chave inválida de propósito: nenhum app de banco consegue pagá-lo. Para testar, simule o pagamento. O banco fictício avisa a loja pelo webhook assinado.</p>
        {error && (
          <p role="alert" className="mt-2 text-[#dd1d1d]">
            {error}
          </p>
        )}
        <button onClick={simulate} disabled={busy} className="mt-3 h-11 rounded-[5px] bg-[#333] px-5 font-semibold text-white hover:bg-black disabled:opacity-60">
          {busy ? 'Pagando…' : 'Simular pagamento do Pix'}
        </button>
      </div>
    </section>
  );
}

export default function OrderPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderView | null | 'missing'>(null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/api/orders/${encodeURIComponent(params.id)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : 'missing'))
      .then(setOrder)
      .catch(() => setOrder((o) => o ?? 'missing'));
  }, [params.id]);

  useEffect(load, [load]);

  const waitingPix = order && order !== 'missing' && order.payment?.method === 'pix' && order.payment.status === 'pending';
  // Polling stands in for a push channel: the webhook may land while the buyer is on another device.
  useEffect(() => {
    if (!waitingPix) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [waitingPix, load]);

  useEffect(() => {
    if (order && order !== 'missing' && order.status === 'paid') trackPurchaseOnce(order);
  }, [order]);

  const newPix = async () => {
    setRetrying(true);
    setError('');
    try {
      await post(`/api/orders/${params.id}/payments`, { method: 'pix' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar o Pix');
    } finally {
      setRetrying(false);
    }
  };

  if (order === null) return <p className="px-5 py-16 text-center text-[#707070]">Carregando pedido…</p>;
  if (order === 'missing') {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="co-h2">Pedido não encontrado</h1>
        <p className="mt-3 text-[#707070]">Confira o link. Se você acabou de comprar, o pedido aparece aqui em alguns segundos.</p>
        <Link href="/products" className="mt-6 inline-block text-checkout underline">
          Continuar comprando
        </Link>
      </div>
    );
  }

  const firstName = order.name.split(' ')[0];
  const paid = order.status === 'paid';
  const payment = order.payment;
  const method = payment?.method ?? order.paymentMethod;
  const needsPayment = !order.seed && !paid && !waitingPix;

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
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${paid ? 'border-checkout text-checkout' : 'border-[#c9c9c9] text-[#707070]'}`}>
          {paid ? <CheckIcon className="h-6 w-6" /> : <span className="text-xl">…</span>}
        </span>
        <div>
          <p className="break-all text-[#707070]">Pedido {order.id}</p>
          <h1 className="co-h2">{order.seed ? `Pedido de ${firstName}` : paid ? `Obrigado, ${firstName}` : `Quase lá, ${firstName}`}</h1>
        </div>
      </div>

      {waitingPix && <PixPanel order={order} onChange={load} />}

      {paid && (
        <section className="mt-6 rounded-[5px] border border-checkout-line p-5">
          <h2 className="text-[17px] font-semibold">Pagamento confirmado</h2>
          <p className="mt-2 text-[#707070]">
            {order.emailStatus ? EMAIL_NOTE[order.emailStatus] : 'Enviando a confirmação por email…'} Pagamento feito no ambiente de testes: nada foi cobrado.
          </p>
        </section>
      )}

      {needsPayment && (
        <section className="mt-6 rounded-[5px] border border-checkout-line p-5">
          <h2 className="text-[17px] font-semibold">
            {payment?.status === 'expired' ? 'O Pix expirou' : payment?.status === 'failed' ? 'Pagamento não aprovado' : 'Aguardando pagamento'}
          </h2>
          <p className="mt-2 text-[#707070]">
            {payment?.status === 'failed' ? failureMessage(payment.failureReason) : 'Gere um novo código Pix para concluir o pedido.'}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-[#dd1d1d]">
              {error}
            </p>
          )}
          <button onClick={newPix} disabled={retrying} className="mt-4 h-11 rounded-[5px] bg-checkout px-5 font-semibold text-white hover:bg-checkout-dark disabled:opacity-60">
            {retrying ? 'Gerando…' : 'Gerar novo Pix'}
          </button>
        </section>
      )}

      <section className="mt-4 rounded-[5px] border border-checkout-line p-5">
        <h2 className="text-[17px] font-semibold">Detalhes do pedido</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Contato</dt>
            <dd className="mt-1 break-all text-[#707070]">{order.email}</dd>
          </div>
          <div>
            <dt className="font-semibold">Forma de pagamento</dt>
            <dd className="mt-1 text-[#707070]">
              {method ? PAYMENT_LABELS[method as PaymentMethod] : '—'}
              {payment?.cardLast4 && ` •••• ${payment.cardLast4}`}
            </dd>
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
        <p className="text-[#707070]">{order.seed ? 'Pedido fictício do conjunto de dados da demo.' : 'Guarde este link para acompanhar o pedido.'}</p>
        <Link href="/products" className="flex h-[56px] items-center rounded-[5px] bg-checkout px-6 text-[15px] font-semibold text-white hover:bg-checkout-dark">
          Continuar comprando
        </Link>
      </div>
    </CheckoutShell>
  );
}
