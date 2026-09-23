'use client';

import { useState } from 'react';
import { useCart } from './CartProvider';
import { toItem, track } from '@/lib/tracking';
import type { Product } from '@/lib/types';

export default function AddToCartButton({ product, className = '' }: { product: Product; className?: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  if (!product.inStock) {
    return (
      <button disabled className={`cursor-not-allowed rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 ${className}`}>
        Indisponível
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        add(product.id);
        track('add_to_cart', { items: [toItem(product)], value: product.priceCents / 100 });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className={`rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 ${className}`}
    >
      <span aria-live="polite">{added ? 'Adicionado ✓' : 'Adicionar ao carrinho'}</span>
    </button>
  );
}
