import { formatBRL } from '@/lib/format';
import type { Product } from '@/lib/types';

// Dawn order: struck compare-at price first, then the sale price, then a "Promoção" badge.
export default function Price({ product, large = false, badge = false }: { product: Product; large?: boolean; badge?: boolean }) {
  const onSale = !!product.originalPriceCents;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${large ? 'text-lg' : 'text-[15px]'}`}>
      {onSale && (
        <s className="text-ink/60">
          <span className="sr-only">Preço original </span>
          {formatBRL(product.originalPriceCents!)}
        </s>
      )}
      <span className="text-ink">
        {onSale && <span className="sr-only">Preço promocional </span>}
        {formatBRL(product.priceCents)}
      </span>
      {badge && onSale && <span className="badge bg-ink text-white">Promoção</span>}
      {badge && !product.inStock && <span className="badge border border-ink/20 text-ink">Esgotado</span>}
    </div>
  );
}
