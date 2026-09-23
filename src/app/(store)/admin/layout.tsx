import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-width py-10 md:py-14">
      {isAdmin() && (
        <div className="mb-8 flex items-center gap-6 border-b border-ink/10 pb-4 text-sm">
          <Link href="/admin" className="font-semibold hover:underline">Painel</Link>
          <Link href="/admin/orders" className="font-semibold hover:underline">Pedidos</Link>
          <form action="/api/admin/logout" method="post" className="ml-auto">
            <button className="text-[#b12704] hover:underline">Sair</button>
          </form>
        </div>
      )}
      {children}
    </div>
  );
}
