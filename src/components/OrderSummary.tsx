import Image from 'next/image';
import { getProduct } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';

export interface SummaryLine {
  productId: string;
  name: string;
  quantity: number;
  totalCents: number;
}

// The grey right-hand column of a hosted checkout: thumbnails with a quantity bubble, then totals.
// `onRemove` is passed only on the checkout; the order page shows the same summary read-only.
export default function OrderSummary({
  lines,
  subtotalCents,
  taxCents,
  onRemove,
  disabled = false,
}: {
  lines: SummaryLine[];
  subtotalCents: number;
  taxCents: number;
  onRemove?: (productId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="text-[14px] text-[#333]">
      <ul className="space-y-4">
        {lines.map((l) => {
          const image = getProduct(l.productId)?.image;
          return (
            <li key={l.productId} className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 rounded-lg border border-black/10 bg-white">
                {image && <Image src={image} alt="" width={64} height={64} className="h-full w-full rounded-lg object-cover" />}
                <span className="absolute -right-2 -top-2 flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-[#666] px-1.5 text-[12px] font-medium text-white">
                  {l.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p>{l.name}</p>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(l.productId)}
                    disabled={disabled}
                    className="mt-0.5 text-[12px] text-[#707070] underline underline-offset-2 transition-colors hover:text-[#333] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remover<span className="sr-only"> {l.name}</span>
                  </button>
                )}
              </div>
              <p>{formatBRL(l.totalCents)}</p>
            </li>
          );
        })}
      </ul>
      <dl className="mt-6 space-y-2">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatBRL(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Entrega</dt>
          <dd>Digital, grátis</dd>
        </div>
        <div className="flex justify-between">
          <dt>Impostos (18%)</dt>
          <dd>{formatBRL(taxCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between pt-3">
          <dt className="text-[19px] font-semibold">Total</dt>
          <dd>
            <span className="mr-2 text-[12px] text-[#707070]">BRL</span>
            <span className="text-[19px] font-semibold">{formatBRL(subtotalCents + taxCents)}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
