import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { queryProducts } from '@/lib/store';
import { CATEGORIES } from '@/lib/types';

export default function HomePage() {
  const featured = queryProducts({ sort: 'featured', page: 1, pageSize: 4 }).items;
  return (
    <>
      <section className="rounded-2xl bg-gray-900 px-6 py-14 text-white sm:px-12">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">Ship your next project faster.</h1>
        <p className="mt-4 max-w-xl text-gray-300">Templates, UI kits, courses and ebooks for web developers.</p>
        <Link href="/products" className="mt-8 inline-block rounded-md bg-white px-5 py-2.5 font-semibold text-gray-900 hover:bg-gray-200">
          Browse products
        </Link>
      </section>

      <nav aria-label="Categories" className="mt-10 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/products?category=${c}`} className="rounded-full border bg-white px-4 py-1.5 text-sm capitalize hover:bg-gray-100">
            {c.replace('-', ' ')}
          </Link>
        ))}
      </nav>

      <h2 className="mt-10 text-2xl font-bold">Best sellers</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}
