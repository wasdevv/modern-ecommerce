'use client';

import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { toItem, track } from '@/lib/tracking';
import type { Product } from '@/lib/types';

export default function AddToCartButton({
  product,
  quantity = 1,
  buyNow = false,
  compact = false,
  className = '',
}: {
  product: Product;
  quantity?: number;
  buyNow?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { add } = useCart();
  const router = useRouter();

  if (!product.inStock) {
    return (
      <button disabled className={`btn-outline ${className}`}>
        Esgotado
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        add(product.id, quantity);
        track('add_to_cart', { items: [toItem(product, quantity)], value: (product.priceCents * quantity) / 100 });
        if (buyNow) router.push('/checkout');
      }}
      className={`${buyNow ? 'btn' : 'btn-outline'} ${className}`}
    >
      {buyNow ? (
        'Comprar agora'
      ) : compact ? (
        <>
          <span className="sm:hidden">Adicionar</span>
          <span className="hidden sm:inline">Adicionar ao carrinho</span>
        </>
      ) : (
        'Adicionar ao carrinho'
      )}
    </button>
  );
}
