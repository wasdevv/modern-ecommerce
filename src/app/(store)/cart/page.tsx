'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useCart } from '@/components/CartProvider';
import { TrashIcon } from '@/components/Icons';
import QuantityInput from '@/components/QuantityInput';
import { getProduct } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import { taxFor } from '@/lib/limits';
import { toItem, track } from '@/lib/tracking';

export default function CartPage() {
  const { lines, hydrated, subtotalCents, setQuantity, remove } = useCart();
  const tracked = useRef(false);

  useEffect(() => {
    if (!hydrated || tracked.current || lines.length === 0) return;
    tracked.current = true;
    track('view_cart', { items: lines.map((l) => toItem(getProduct(l.productId)!, l.quantity)), value: subtotalCents / 100 });
  }, [hydrated, lines, subtotalCents]);

  if (!hydrated) {
    return (
      <div className="page-width py-16" aria-busy>
        <div className="h-10 w-56 animate-pulse bg-mist" />
        <div className="mt-10 h-32 animate-pulse bg-mist" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="page-width py-24 text-center">
        <h1 className="text-[32px] md:text-[40px]">Seu carrinho está vazio</h1>
        <Link href="/products" className="btn mt-8">
          Continuar comprando
        </Link>
      </div>
    );
  }

  const blocked = lines.some((l) => !getProduct(l.productId)!.inStock);

  return (
    <div className="page-width pb-20">
      <div className="flex items-center justify-between py-10 md:py-14">
        <h1 className="text-[32px] md:text-[40px]">Seu carrinho</h1>
        <Link href="/products" className="link text-[15px]">
          Continuar comprando
        </Link>
      </div>

      <table className="w-full text-left">
        <thead className="border-b border-ink/10 text-[11px] uppercase tracking-label text-ink/75">
          <tr>
            <th className="pb-4 font-normal">Produto</th>
            <th className="hidden pb-4 font-normal md:table-cell">Quantidade</th>
            <th className="pb-4 text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const product = getProduct(line.productId)!;
            const controls = (
              <div className="flex items-center gap-3">
                <QuantityInput value={line.quantity} onChange={(n) => setQuantity(product.id, n)} label={product.name} />
                <button onClick={() => remove(product.id)} className="flex h-11 w-11 items-center justify-center text-ink hover:scale-110" aria-label={`Remover ${product.name}`}>
                  <TrashIcon />
                </button>
              </div>
            );
            return (
              <tr key={line.productId} className="align-top">
                <td className="pt-10">
                  <div className="flex gap-5 md:gap-10">
                    <Link href={`/products/${product.id}`} className="shrink-0">
                      <Image src={product.image} alt={product.name} width={120} height={120} className="h-[90px] w-[90px] bg-mist object-cover md:h-[120px] md:w-[120px]" />
                    </Link>
                    <div>
                      <Link href={`/products/${product.id}`} className="text-[15px] text-ink hover:underline hover:underline-offset-4 md:text-base">
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm">{formatBRL(product.priceCents)}</p>
                      {!product.inStock && <p className="mt-1 text-sm text-[#b12704]">Esgotado — remova para finalizar a compra.</p>}
                      <div className="mt-4 md:hidden">{controls}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden pt-10 md:table-cell">{controls}</td>
                <td className="pt-10 text-right text-[15px] text-ink">{formatBRL(product.priceCents * line.quantity)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-12 flex flex-col items-end border-t border-ink/10 pt-10 text-right">
        <p className="text-base text-ink">
          Subtotal <span className="ml-4 text-lg">{formatBRL(subtotalCents)}</span>
        </p>
        <p className="mt-2 text-[13px]">
          + {formatBRL(taxFor(subtotalCents))} de impostos (18%) no checkout. Produto digital, sem frete.
        </p>
        {blocked ? (
          <button disabled className="btn mt-6 w-full md:w-[360px]">
            Finalizar compra
          </button>
        ) : (
          <Link href="/checkout" className="btn mt-6 w-full md:w-[360px]">
            Finalizar compra
          </Link>
        )}
      </div>
    </div>
  );
}
