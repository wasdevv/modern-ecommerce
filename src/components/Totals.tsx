import { formatBRL } from '@/lib/format';

export default function Totals({ subtotalCents, taxCents }: { subtotalCents: number; taxCents: number }) {
  return (
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd>{formatBRL(subtotalCents)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Impostos (18%)</dt>
        <dd>{formatBRL(taxCents)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Entrega</dt>
        <dd>Digital, grátis</dd>
      </div>
      <div className="flex justify-between border-t pt-2 text-base font-bold">
        <dt>Total</dt>
        <dd>{formatBRL(subtotalCents + taxCents)}</dd>
      </div>
    </dl>
  );
}
