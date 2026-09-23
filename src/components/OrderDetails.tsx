import Totals from './Totals';
import { formatBRL, formatDate } from '@/lib/format';
import { PAYMENT_LABELS, STATUS_LABELS, type Order } from '@/lib/types';

export default function OrderDetails({ order }: { order: Order }) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <p className="text-sm text-gray-600">
        {formatDate(order.createdAt)} · {PAYMENT_LABELS[order.paymentMethod]} · {STATUS_LABELS[order.status]}
      </p>
      <ul className="my-4 space-y-2 border-b pb-4 text-sm">
        {order.items.map((i) => (
          <li key={i.productId} className="flex justify-between gap-4">
            <span>
              {i.productName} × {i.quantity}
            </span>
            <span>{formatBRL(i.totalCents)}</span>
          </li>
        ))}
      </ul>
      <Totals subtotalCents={order.subtotalCents} taxCents={order.taxCents} />
    </div>
  );
}
