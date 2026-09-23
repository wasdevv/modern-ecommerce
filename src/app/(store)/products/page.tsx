import type { Metadata } from 'next';
import Link from 'next/link';
import AutoSubmitSelect from '@/components/AutoSubmitSelect';
import ProductCard from '@/components/ProductCard';
import { parseProductQuery, queryProducts, SORTS, type ProductQuery } from '@/lib/store';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

export const metadata: Metadata = { title: 'Produtos', alternates: { canonical: '/products' } };

const SORT_LABELS: Record<(typeof SORTS)[number], string> = {
  featured: 'Mais vendidos',
  price_asc: 'Preço, menor para maior',
  price_desc: 'Preço, maior para menor',
  newest: 'Mais recentes',
  rating: 'Mais bem avaliados',
};

const href = (q: ProductQuery, page: number) => {
  const params = new URLSearchParams({ ...(q.category && { category: q.category }), ...(q.search && { search: q.search }), sort: q.sort, page: String(page) });
  return `/products?${params}`;
};

export default function ProductsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const parsed = parseProductQuery(searchParams);
  if (!parsed.ok) {
    return (
      <div className="page-width py-16">
        <p>
          {parsed.error}. <Link href="/products" className="link">Limpar filtros</Link>
        </p>
      </div>
    );
  }
  const q = parsed.value;
  const result = queryProducts(q);
  const title = q.search ? `Resultados para “${q.search}”` : q.category ? CATEGORY_LABELS[q.category] : 'Produtos';

  return (
    <div className="page-width pb-16">
      <h1 className="py-10 text-[32px] md:py-14 md:text-[40px]">{title}</h1>

      {/* A plain GET form: filters live in the URL and still work without JavaScript. */}
      <form className="flex flex-col gap-3 border-b border-ink/10 pb-4 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-ink/75">Filtrar:</span>
          <label className="flex items-center gap-1">
            <span className="sr-only">Categoria</span>
            <AutoSubmitSelect name="category" defaultValue={q.category ?? ''}>
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
          {q.search && <input type="hidden" name="search" value={q.search} />}
          {q.search && (
            <Link href={`/products?${new URLSearchParams({ ...(q.category && { category: q.category }), sort: q.sort })}`} className="badge flex items-center gap-1 border border-ink/20 text-ink hover:border-ink">
              Busca: {q.search} <span aria-hidden>×</span>
              <span className="sr-only">remover busca</span>
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap text-ink/75">Ordenar por:</span>
            <AutoSubmitSelect name="sort" defaultValue={q.sort}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
          <p className="whitespace-nowrap text-ink/75" aria-live="polite">
            {result.total} {result.total === 1 ? 'produto' : 'produtos'}
          </p>
          <noscript>
            <button className="link">Aplicar</button>
          </noscript>
        </div>
      </form>

      <h2 className="sr-only">Lista de produtos</h2>
      {result.total === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-ink">Nenhum produto encontrado</p>
          <p className="mt-2">Use menos filtros ou remova todos.</p>
          <Link href="/products" className="btn-outline mt-6">
            Remover todos
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-4">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Paginação" className="mt-14 flex items-center justify-center gap-1 text-[15px]">
          {q.page > 1 && (
            <Link href={href(q, q.page - 1)} className="flex h-11 w-11 items-center justify-center text-ink" aria-label="Página anterior">
              ←
            </Link>
          )}
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) =>
            n === q.page ? (
              <span key={n} aria-current="page" className="flex h-11 w-11 items-center justify-center text-ink underline underline-offset-4">
                {n}
              </span>
            ) : (
              <Link key={n} href={href(q, n)} className="flex h-11 w-11 items-center justify-center hover:text-ink hover:underline hover:underline-offset-4">
                {n}
              </Link>
            ),
          )}
          {q.page < result.pageCount && (
            <Link href={href(q, q.page + 1)} className="flex h-11 w-11 items-center justify-center text-ink" aria-label="Próxima página">
              →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
