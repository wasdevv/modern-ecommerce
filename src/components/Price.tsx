import { formatBRL } from '@/lib/format';
import type { Product } from '@/lib/types';

export default function Price({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <p className={large ? 'text-3xl font-bold' : 'font-bold'}>
      {formatBRL(product.priceCents)}
      {product.originalPriceCents && (
        <s className="ml-2 text-sm font-normal text-gray-500">
          <span className="sr-only">was </span>
          {formatBRL(product.originalPriceCents)}
        </s>
      )}
    </p>
  );
}
