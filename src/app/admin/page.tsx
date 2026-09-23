import AdminLogin from '@/components/AdminLogin';
import { isAdmin } from '@/lib/admin-auth';
import { formatBRL, formatDate } from '@/lib/format';
import { getAnalytics } from '@/lib/store';

export default function AdminPage({ searchParams }: { searchParams: { error?: string } }) {
  if (!isAdmin()) return <AdminLogin failed={searchParams.error === '1'} />;

  const a = getAnalytics();
  const maxMonth = Math.max(...a.revenueByMonth.map((m) => m.cents));
  const kpis = [
    ['Receita (com impostos)', formatBRL(a.revenueCents)],
    ['Pedidos', `${a.orderCount}`],
    ['Ticket médio', formatBRL(a.averageOrderCents)],
    ['Conversão', `${(a.conversionRate * 100).toFixed(2).replace('.', ',')}%`],
  ];

  return (
    <>
      <h1 className="text-3xl font-bold">Painel</h1>
      <p className="mt-1 text-sm text-gray-600">
        Dados seed, de {formatDate(a.period.start + 'T12:00:00Z')} a {formatDate(a.period.end + 'T12:00:00Z')}. {a.customerCount} clientes, {a.refundedCount} reembolsos excluídos. A conversão usa{' '}
        {a.simulatedSessions.toLocaleString('pt-BR')} sessões declaradas (não medidas).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-white p-5">
            <p className="text-sm text-gray-600">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-bold">Receita por mês</h2>
          <ul className="mt-4 space-y-3">
            {a.revenueByMonth.map((m) => (
              <li key={m.month} className="grid grid-cols-[4rem_1fr_7rem] items-center gap-3 text-sm">
                <span>{m.month}</span>
                <span className="h-3 rounded bg-gray-900" style={{ width: `${(m.cents / maxMonth) * 100}%` }} />
                <span className="text-right">{formatBRL(m.cents)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-bold">Produtos com maior receita</h2>
          <ol className="mt-4 divide-y text-sm">
            {a.topProducts.map((p) => (
              <li key={p.productId} className="flex justify-between gap-4 py-2">
                <span>
                  {p.name} <span className="text-gray-500">· {p.units} vendidos</span>
                </span>
                <span className="font-semibold">{formatBRL(p.revenueCents)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
