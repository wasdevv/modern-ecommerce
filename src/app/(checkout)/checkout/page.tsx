'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import CheckoutShell from '@/components/CheckoutShell';
import OrderSummary from '@/components/OrderSummary';
import { getProduct } from '@/lib/catalog';
import { taxFor } from '@/lib/limits';
import { saveReceipt } from '@/lib/receipts';
import { toItem, track } from '@/lib/tracking';
import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod, type Receipt } from '@/lib/types';

const PAYMENT_NOTE: Record<PaymentMethod, string> = {
  pix: 'Na loja real, o QR code do Pix aparece depois de finalizar. Nesta demo nenhum código é gerado.',
  card: 'Nenhum dado de cartão é pedido: esta é uma compra simulada.',
  boleto: 'Na loja real, o boleto seria emitido depois de finalizar. Nesta demo o pedido fica como pendente.',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, hydrated, subtotalCents, clear } = useCart();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'placed'>('idle');
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!hydrated || tracked.current || lines.length === 0) return;
    tracked.current = true;
    track('begin_checkout', { items: lines.map((l) => toItem(getProduct(l.productId)!, l.quantity)), value: subtotalCents / 100 });
  }, [hydrated, lines, subtotalCents]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (!hydrated || status === 'placed') {
    return <p className="px-5 py-16 text-center text-[#707070]">{status === 'placed' ? 'Pedido feito, abrindo a confirmação…' : 'Carregando…'}</p>;
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
  const summaryLines = lines.map((l) => {
    const p = getProduct(l.productId)!;
    return { productId: p.id, name: p.name, quantity: l.quantity, totalCents: p.priceCents * l.quantity };
  });

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
          paymentMethod: payment,
          items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error || 'Não foi possível criar o pedido.');
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
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Erro de rede. Tente novamente.');
      setStatus('idle');
    }
  };

  return (
    <CheckoutShell summary={<OrderSummary lines={summaryLines} subtotalCents={subtotalCents} taxCents={taxCents} />} totalCents={subtotalCents + taxCents}>
      <h1 className="sr-only">Finalizar compra</h1>
      <form onSubmit={onSubmit} className="space-y-8">
        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-[5px] border border-[#dd1d1d] bg-[#fff4f4] p-4 text-[#dd1d1d] outline-none">
            {error}
          </p>
        )}

        <section>
          <h2 className="co-h2">Contato</h2>
          <div className="relative mt-4">
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="Email" className="co-input peer" />
            <label htmlFor="email" className="co-label">Email</label>
          </div>
        </section>

        <section>
          <h2 className="co-h2">Entrega</h2>
          <div className="relative mt-4">
            <input id="name" name="name" required maxLength={100} autoComplete="name" placeholder="Nome completo" className="co-input peer" />
            <label htmlFor="name" className="co-label">Nome completo</label>
          </div>
          <p className="mt-3 rounded-[5px] bg-checkout-panel p-4 text-[#707070]">Produto digital: o acesso seria enviado para o seu email. Sem frete.</p>
        </section>

        <section>
          <h2 className="co-h2">Pagamento</h2>
          <p className="mt-1 text-[#707070]">Compra simulada: nada será cobrado.</p>
          <fieldset className="mt-4 overflow-hidden rounded-[5px] border border-checkout-line">
            <legend className="sr-only">Forma de pagamento</legend>
            {PAYMENT_METHODS.map((m) => (
              <div key={m} className="border-b border-checkout-line last:border-b-0">
                <label className={`flex cursor-pointer items-center gap-3 px-4 py-4 ${payment === m ? 'bg-[#f0f5ff] shadow-[inset_0_0_0_1px_#1773b0]' : ''}`}>
                  <input type="radio" name="paymentMethod" value={m} checked={payment === m} onChange={() => setPayment(m)} className="h-[18px] w-[18px] accent-checkout" />
                  {PAYMENT_LABELS[m]}
                </label>
                {payment === m && <p className="border-t border-checkout-line bg-checkout-panel px-4 py-5 text-center text-[#707070]">{PAYMENT_NOTE[m]}</p>}
              </div>
            ))}
          </fieldset>
        </section>

        <button
          disabled={status === 'submitting'}
          className="h-[56px] w-full rounded-[5px] bg-checkout text-[17px] font-semibold text-white transition-colors hover:bg-checkout-dark disabled:cursor-wait disabled:opacity-70"
        >
          {status === 'submitting' ? 'Processando…' : 'Finalizar pedido'}
        </button>
        <p className="text-center text-[12px] text-[#707070]">Os preços finais são confirmados pelo servidor.</p>
      </form>
    </CheckoutShell>
  );
}
