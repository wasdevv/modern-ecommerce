import Link from 'next/link';
import { redirect } from 'next/navigation';
import LocalOrders from '@/components/LocalOrders';
import { isAdmin } from '@/lib/admin-auth';
import { formatBRL, formatDate } from '@/lib/format';
import { seedOrders } from '@/lib/store';
import { STATUS_LABELS } from '@/lib/types';

const PAGE_SIZE = 20;

export default function AdminOrdersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  if (!isAdmin()) redirect('/admin');

  const q = (searchParams.q ?? '').trim().toLowerCase();
  const matches = [...seedOrders]
    .reverse()
    .filter((o) => !q || o.id.includes(q) || o.name.toLowerCase().includes(q) || o.email.includes(q));
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1));
  const rows = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const link = (p: number) => `/admin/orders?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <>
      <h1 className="text-3xl font-bold">Pedidos</h1>
      <LocalOrders />
      <form className="mt-6 flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Buscar pedidos</span>
          <input name="q" type="search" defaultValue={q} placeholder="ID do pedido, nome ou email" className="w-full rounded-md border px-3 py-2 text-sm" />
        </label>
        <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Buscar</button>
      </form>
      <p className="mt-4 text-sm text-gray-600">{matches.length} pedidos seed (clientes fictícios, somente leitura: não há banco de dados compartilhado).</p>
      <div className="mt-2 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Pedido</th>
              <th className="p-3">Data</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Itens</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-mono">{o.id}</td>
                <td className="whitespace-nowrap p-3">{formatDate(o.createdAt)}</td>
                <td className="p-3">
                  {o.name}
                  <br />
                  <span className="text-gray-500">{o.email}</span>
                </td>
                <td className="p-3">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td className="p-3">{STATUS_LABELS[o.status]}</td>
                <td className="whitespace-nowrap p-3 text-right">{formatBRL(o.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav aria-label="Paginação" className="mt-6 flex justify-center gap-4 text-sm">
          {page > 1 && <Link href={link(page - 1)} className="underline">Anterior</Link>}
          <span>
            Página {page} de {pageCount}
          </span>
          {page < pageCount && <Link href={link(page + 1)} className="underline">Próxima</Link>}
        </nav>
      )}
    </>
  );
}
