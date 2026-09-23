import Image from 'next/image';
import Link from 'next/link';
import AddToCartButton from './AddToCartButton';
import Price from './Price';
import { formatRating } from '@/lib/format';
import type { Product } from '@/lib/types';

// Dawn's card: borderless, image on a studio background, badge over the image, quick add below.
export default function ProductCard({ product, quickAdd = true }: { product: Product; quickAdd?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-mist">
        <Image
          src={product.image}
          alt=""
          fill
          sizes="(min-width: 990px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        {(product.originalPriceCents || !product.inStock) && (
          <span className={`badge absolute bottom-3 left-3 ${product.inStock ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
            {product.inStock ? 'Promoção' : 'Esgotado'}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <h3 className="text-[15px] leading-snug md:text-base">
          {/* The ::after stretches the link over the whole card, as in Dawn. */}
          <Link href={`/products/${product.id}`} className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-[0.3rem]">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-[13px] text-ink/60" aria-label={`Nota ${formatRating(product.rating)} de 5, ${product.reviewCount} avaliações`}>
          <span className="text-ink">★</span> {formatRating(product.rating)} ({product.reviewCount})
        </p>
        <div className="mb-auto mt-2">
          <Price product={product} />
        </div>
        {quickAdd && <AddToCartButton product={product} compact className="relative z-10 mt-4 w-full px-2 text-sm" />}
      </div>
    </article>
  );
}
