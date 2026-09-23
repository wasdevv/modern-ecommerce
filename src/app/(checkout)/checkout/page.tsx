'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import CheckoutShell from '@/components/CheckoutShell';
import CoField from '@/components/CoField';
import OrderSummary from '@/components/OrderSummary';
import { getProduct } from '@/lib/catalog';
import { taxFor } from '@/lib/limits';
import { failureMessage } from '@/lib/payments/labels';
import { TEST_CARDS } from '@/lib/payments/test-cards';
import { randomKey, rememberOrder, trackPurchaseOnce } from '@/lib/purchase';
import { toItem, track } from '@/lib/tracking';

type Method = 'pix' | 'card';

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}

const formatCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const selected = 'bg-[#f0f5ff] shadow-[inset_0_0_0_1px_#1773b0]';

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, hydrated, subtotalCents, clear } = useCart();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'leaving'>('idle');
  const [method, setMethod] = useState<Method>('pix');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', holder: '' });
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const tracked = useRef(false);
  // The order is created once per checkout; a declined card retries payment on the same order.
  const order = useRef<{ id: string; buyer: string } | null>(null);

  useEffect(() => {
    if (!hydrated || tracked.current || lines.length === 0) return;
    tracked.current = true;
    track('begin_checkout', { items: lines.map((l) => toItem(getProduct(l.productId)!, l.quantity)), value: subtotalCents / 100 });
  }, [hydrated, lines, subtotalCents]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (!hydrated || status === 'leaving') {
    return <p className="px-5 py-16 text-center text-[#707070]">{status === 'leaving' ? 'Abrindo seu pedido…' : 'Carregando…'}</p>;
  }
  if (lines.length === 0) {
    return (
      <div className="px-5 py-24 text-center">
        <h1 className="co-h2">Seu carrinho está vazio</h1>
        <Link href="/products" className="mt-4 inline-block text-checkout underline">
          Continuar comprando
        </Link>
      </div>
    );
  }

  const taxCents = taxFor(subtotalCents);
  const items = lines.map((l) => {
    const p = getProduct(l.productId)!;
    return { productId: p.id, productName: p.name, quantity: l.quantity, unitPriceCents: p.priceCents, totalCents: p.priceCents * l.quantity };
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== 'idle') return;
    setStatus('submitting');
    setError('');
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '');
    const email = String(form.get('email') ?? '');
    try {
      // 1. Card data goes to the gateway's tokenization endpoint, never to the order API.
      const cardToken = method === 'card' ? (await postJson('/api/payments/sandbox/tokens', card)).token : undefined;

      // 2. Create the order once. Changing name or email afterwards starts a new order; the old one stays unpaid.
      const buyer = `${name}\n${email}`;
      if (!order.current || order.current.buyer !== buyer) {
        const created = await postJson(
          '/api/orders',
          { name, email, items: lines.map(({ productId, quantity }) => ({ productId, quantity })) },
          { 'Idempotency-Key': randomKey() },
        );
        order.current = { id: created.id, buyer };
        rememberOrder(created.id);
      }
      const orderId = order.current.id;

      // 3. Pay it.
      const payment = await postJson(`/api/orders/${orderId}/payments`, { method, cardToken });
      if (payment.status === 'failed') {
        setError(failureMessage(payment.failureReason));
        setStatus('idle');
        return;
      }
      if (payment.status === 'succeeded') trackPurchaseOnce({ id: orderId, totalCents: subtotalCents + taxCents, taxCents, items });
      // Paid by card, or waiting for the Pix: either way the order exists and the cart is done.
      setStatus('leaving');
      clear();
      router.push(`/order/${orderId}`);
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Erro de rede. Tente novamente.');
      setStatus('idle');
    }
  };

  return (
    <CheckoutShell
      summary={<OrderSummary lines={items.map((i) => ({ ...i, name: i.productName }))} subtotalCents={subtotalCents} taxCents={taxCents} />}
      totalCents={subtotalCents + taxCents}
    >
      <h1 className="sr-only">Finalizar compra</h1>
      <form onSubmit={onSubmit} className="space-y-8">
        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-[5px] border border-[#dd1d1d] bg-[#fff4f4] p-4 text-[#dd1d1d] outline-none">
            {error}
          </p>
        )}

        <section>
          <h2 className="co-h2">Contato</h2>
          <div className="mt-4">
            <CoField id="email" name="email" label="Email" type="email" required maxLength={254} autoComplete="email" />
          </div>
        </section>

        <section>
          <h2 className="co-h2">Entrega</h2>
          <div className="mt-4">
            <CoField id="name" name="name" label="Nome completo" required maxLength={100} autoComplete="name" />
          </div>
          <p className="mt-3 rounded-[5px] bg-checkout-panel p-4 text-[#707070]">Produto digital: o acesso seria enviado para o seu email. Sem frete.</p>
        </section>

        <section>
          <h2 className="co-h2">Pagamento</h2>
          <p className="mt-1 text-[#707070]">Ambiente de testes (sandbox): nenhum valor é cobrado.</p>
          <fieldset className="mt-4 overflow-hidden rounded-[5px] border border-checkout-line">
            <legend className="sr-only">Forma de pagamento</legend>

            <div className="border-b border-checkout-line">
              <label className={`flex cursor-pointer items-center gap-3 px-4 py-4 ${method === 'pix' ? selected : ''}`}>
                <input type="radio" name="method" value="pix" checked={method === 'pix'} onChange={() => setMethod('pix')} className="h-[18px] w-[18px] accent-checkout" />
                Pix
                <span className="ml-auto text-[12px] text-[#707070]">aprovação na hora</span>
              </label>
              {method === 'pix' && (
                <p className="border-t border-checkout-line bg-checkout-panel px-4 py-5 text-center text-[#707070]">
                  Depois de finalizar, você recebe o QR code e o código copia e cola. O Pix vale por 30 minutos.
                </p>
              )}
            </div>

            <div>
              <label className={`flex cursor-pointer items-center gap-3 px-4 py-4 ${method === 'card' ? selected : ''}`}>
                <input type="radio" name="method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} className="h-[18px] w-[18px] accent-checkout" />
                Cartão de crédito
                <span className="ml-auto flex gap-1 text-[10px] font-semibold uppercase text-[#707070]">
                  <span className="rounded border border-checkout-line px-1">Visa</span>
                  <span className="rounded border border-checkout-line px-1">Master</span>
                </span>
              </label>
              {method === 'card' && (
                <div className="space-y-3 border-t border-checkout-line bg-checkout-panel p-4">
                  <CoField
                    id="card-number"
                    label="Número do cartão"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    required
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <CoField
                      id="card-expiry"
                      label="Validade (MM/AA)"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      required
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                    />
                    <CoField
                      id="card-cvc"
                      label="Código de segurança"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      required
                      maxLength={4}
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <CoField id="card-holder" label="Nome impresso no cartão" autoComplete="cc-name" required value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} />

                  <div className="rounded-[5px] border border-dashed border-[#c9c9c9] bg-white p-3 text-[13px]">
                    <p className="font-semibold text-[#333]">Cartões de teste</p>
                    <p className="text-[#707070]">Clique para preencher. Cartões reais são recusados.</p>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(TEST_CARDS).map(([number, c]) => (
                        <li key={number}>
                          <button
                            type="button"
                            onClick={() => setCard({ number: formatCardNumber(number), expiry: '12/34', cvc: '123', holder: card.holder || 'Cliente Teste' })}
                            className="flex w-full justify-between gap-3 rounded px-2 py-1 text-left hover:bg-checkout-panel"
                          >
                            <span className="font-mono">{formatCardNumber(number)}</span>
                            <span className="text-[#707070]">{c.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </fieldset>
        </section>

        <button
          disabled={status === 'submitting'}
          className="h-[56px] w-full rounded-[5px] bg-checkout text-[17px] font-semibold text-white transition-colors hover:bg-checkout-dark disabled:cursor-wait disabled:opacity-70"
        >
          {status === 'submitting' ? 'Processando…' : method === 'pix' ? 'Gerar Pix' : 'Pagar agora'}
        </button>
        <p className="text-center text-[12px] text-[#707070]">Os preços finais são confirmados pelo servidor.</p>
      </form>
    </CheckoutShell>
  );
}
