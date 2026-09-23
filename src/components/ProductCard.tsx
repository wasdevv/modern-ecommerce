import Image from 'next/image';
import Link from 'next/link';
import AddToCartButton from './AddToCartButton';
import { formatRating } from '@/lib/format';
import Price from './Price';
import { CATEGORY_LABELS, type Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-white">
      <Link href={`/products/${product.id}`} aria-hidden tabIndex={-1} className="relative aspect-[4/3] bg-gray-100">
        <Image src={product.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">{CATEGORY_LABELS[product.category]}</p>
        <h2 className="mt-1 font-semibold leading-snug">
          <Link href={`/products/${product.id}`} className="hover:underline">
            {product.name}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          ★ {formatRating(product.rating)} <span className="text-gray-500">({product.reviewCount} avaliações demo)</span>
        </p>
        <div className="mt-auto space-y-3 pt-4">
          <Price product={product} />
          <AddToCartButton product={product} className="w-full" />
        </div>
      </div>
    </article>
  );
}
