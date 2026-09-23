import Image from 'next/image';
import Link from 'next/link';
import AddToCartButton from './AddToCartButton';
import Price from './Price';
import type { Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-white">
      <Link href={`/products/${product.id}`} aria-hidden tabIndex={-1} className="relative aspect-[4/3] bg-gray-100">
        <Image src={product.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">{product.category.replace('-', ' ')}</p>
        <h2 className="mt-1 font-semibold leading-snug">
          <Link href={`/products/${product.id}`} className="hover:underline">
            {product.name}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          ★ {product.rating.toFixed(1)} <span className="text-gray-500">({product.reviewCount} demo reviews)</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <Price product={product} />
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
