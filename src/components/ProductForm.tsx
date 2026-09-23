'use client';

import { useState } from 'react';
import AddToCartButton from './AddToCartButton';
import QuantityInput from './QuantityInput';
import type { Product } from '@/lib/types';

export default function ProductForm({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  return (
    <div className="mt-6 max-w-[440px]">
      {product.inStock && (
        <>
          <p className="mb-2 text-[13px]">Quantidade</p>
          <QuantityInput value={quantity} onChange={setQuantity} label={product.name} />
        </>
      )}
      <div className="mt-6 grid gap-3">
        <AddToCartButton product={product} quantity={quantity} className="w-full" />
        {product.inStock && <AddToCartButton product={product} quantity={quantity} buyNow className="w-full" />}
      </div>
    </div>
  );
}
