import Link from 'next/link';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10">
      <div className="page-width grid gap-10 py-12 md:grid-cols-3 md:py-16">
        <div>
          <h2 className="text-lg">Categorias</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link href={`/products?category=${c}`} className="hover:text-ink hover:underline hover:underline-offset-4">
                  {CATEGORY_LABELS[c]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg">Sobre a loja</h2>
          <p className="mt-4 max-w-sm text-sm">
            ModernStore é um projeto de portfólio. Produtos, avaliações e pedidos são simulados, e nenhuma compra é cobrada.
          </p>
        </div>
        <div>
          <h2 className="text-lg">Links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-ink hover:underline hover:underline-offset-4">Catálogo completo</Link></li>
            <li><Link href="/cart" className="hover:text-ink hover:underline hover:underline-offset-4">Carrinho</Link></li>
            <li><Link href="/admin" className="hover:text-ink hover:underline hover:underline-offset-4">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/10">
        <div className="page-width flex flex-col items-center justify-between gap-4 py-6 text-xs md:flex-row">
          <ul className="flex gap-2" aria-label="Formas de pagamento aceitas">
            {['Pix', 'Cartão', 'Boleto'].map((m) => (
              <li key={m} className="rounded border border-ink/15 px-2 py-0.5 text-[11px] text-ink/75">{m}</li>
            ))}
          </ul>
          <p>© 2026, ModernStore</p>
        </div>
      </div>
    </footer>
  );
}
