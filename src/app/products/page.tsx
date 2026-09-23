import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { parseProductQuery, queryProducts, SORTS, type ProductQuery } from '@/lib/store';
import { CATEGORIES } from '@/lib/types';

export const metadata: Metadata = { title: 'Products', alternates: { canonical: '/products' } };

const SORT_LABELS: Record<(typeof SORTS)[number], string> = {
  featured: 'Best sellers',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  newest: 'Newest',
  rating: 'Top rated',
};

const href = (q: ProductQuery, page: number) => {
  const params = new URLSearchParams({ ...(q.category && { category: q.category }), ...(q.search && { search: q.search }), sort: q.sort, page: String(page) });
  return `/products?${params}`;
};

export default function ProductsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const parsed = parseProductQuery(searchParams);
  if (!parsed.ok) {
    return (
      <p>
        {parsed.error}. <Link href="/products" className="underline">Reset filters</Link>
      </p>
    );
  }
  const q = parsed.value;
  const result = queryProducts(q);

  return (
    <>
      <h1 className="text-3xl font-bold">Products</h1>
      {/* A plain GET form: filters live in the URL, work without JS and are shareable. */}
      <form className="mt-6 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Search</span>
          <input name="search" type="search" defaultValue={q.search} placeholder="e.g. dashboard" className="w-full rounded-md border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Category</span>
          <select name="category" defaultValue={q.category ?? ''} className="w-full rounded-md border px-3 py-2 capitalize">
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace('-', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Sort</span>
          <select name="sort" defaultValue={q.sort} className="w-full rounded-md border px-3 py-2">
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <button className="self-end rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">Apply</button>
      </form>

      <p className="mt-6 text-sm text-gray-600" aria-live="polite">
        {result.total} {result.total === 1 ? 'product' : 'products'}
      </p>
      {result.total === 0 ? (
        <p className="mt-6">
          Nothing matches these filters. <Link href="/products" className="underline">Clear filters</Link>
        </p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4 text-sm">
          {q.page > 1 ? <Link href={href(q, q.page - 1)} className="underline">Previous</Link> : <span className="text-gray-500">Previous</span>}
          <span>
            Page {q.page} of {result.pageCount}
          </span>
          {q.page < result.pageCount ? <Link href={href(q, q.page + 1)} className="underline">Next</Link> : <span className="text-gray-500">Next</span>}
        </nav>
      )}
    </>
  );
}
