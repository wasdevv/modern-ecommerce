import Link from 'next/link';
import { dbConfigured } from '@/lib/db';
import { formatBRL, formatDate } from '@/lib/format';
import { listStoreOrders } from '@/lib/payments/service';
import { PAYMENT_LABELS, STATUS_LABELS, type PaymentMethod } from '@/lib/types';

const PAYMENT_STATUS: Record<string, string> = {
  pending: 'aguardando',
  succeeded: 'aprovado',
  failed: 'recusado',
  expired: 'expirado',
  cancelled: 'substituído',
};

// Orders placed through the checkout, read from Postgres.
export default async function StoreOrders() {
  if (!dbConfigured()) return <p className="mt-6 bg-mist p-4 text-sm">DATABASE_URL não configurada: pedidos da loja indisponíveis.</p>;
  const orders = await listStoreOrders();
  return (
    <section className="mt-8">
      <h2 className="text-xl">Pedidos da loja</h2>
      {orders.length === 0 ? (
        <p className="mt-2 text-sm">Nenhum pedido ainda. Faça uma compra de teste pelo checkout.</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-ink/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-mist">
              <tr>
                <th className="p-3">Pedido</th>
                <th className="p-3">Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="max-w-[12rem] truncate p-3 font-mono">
                    <Link href={`/order/${o.id}`} className="underline">
                      {o.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap p-3">{formatDate(o.created_at.toISOString())}</td>
                  <td className="p-3">
                    {o.name}
                    <br />
                    <span className="text-ink/75">{o.email}</span>
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {o.payment_method ? `${PAYMENT_LABELS[o.payment_method as PaymentMethod]} · ${PAYMENT_STATUS[o.payment_status ?? ''] ?? ''}` : '—'}
                  </td>
                  <td className="p-3">{STATUS_LABELS[o.status]}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatBRL(o.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
