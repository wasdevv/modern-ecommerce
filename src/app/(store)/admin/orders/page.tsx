import Link from 'next/link';
import { redirect } from 'next/navigation';
import StoreOrders from '@/components/StoreOrders';
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
      <h1 className="text-[32px] md:text-[40px]">Pedidos</h1>
      <StoreOrders />
      <h2 className="mt-12 text-xl">Histórico (seed)</h2>
      <form className="mt-6 flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Buscar pedidos</span>
          <input name="q" type="search" defaultValue={q} placeholder="ID do pedido, nome ou email" className="field peer pt-0 placeholder:text-ink/50" />
        </label>
        <button className="btn">Buscar</button>
      </form>
      <p className="mt-4 text-sm text-ink/75">{matches.length} pedidos fictícios do conjunto de dados (somente leitura).</p>
      <div className="mt-2 overflow-x-auto border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-mist">
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
                  <span className="text-ink/75">{o.email}</span>
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
