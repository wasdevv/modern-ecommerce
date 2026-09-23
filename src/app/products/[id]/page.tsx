import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';
import Price from '@/components/Price';
import TrackEvent from '@/components/TrackEvent';
import { getProduct, products } from '@/lib/catalog';
import { formatRating, siteUrl } from '@/lib/format';
import { toItem } from '@/lib/tracking';
import { CATEGORY_LABELS } from '@/lib/types';

export const generateStaticParams = () => products.map((p) => ({ id: p.id }));
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const product = getProduct(params.id);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: { title: product.name, description: product.description, images: [product.image], url: `/products/${product.id}` },
  };
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getProduct(params.id);
  if (!product) notFound();

  // Ratings are demo data, so no aggregateRating: Google treats fake review markup as spam.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: `${siteUrl()}${product.image}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: (product.priceCents / 100).toFixed(2),
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl()}/products/${product.id}`,
    },
  };

  return (
    <>
      {/* Escape "<" so product text can never close the script tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <TrackEvent event="view_item" items={[toItem(product)]} value={product.priceCents / 100} />
      <Link href="/products" className="text-sm text-gray-600 hover:underline">
        ← Todos os produtos
      </Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
          <Image src={product.image} alt={product.name} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">{CATEGORY_LABELS[product.category]}</p>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            ★ {formatRating(product.rating)} · {product.reviewCount} avaliações <span className="text-gray-500">(dados de demonstração)</span>
          </p>
          <div className="mt-6">
            <Price product={product} large />
          </div>
          <p className="mt-6 text-gray-700">{product.description}</p>
          {!product.inStock && <p className="mt-4 text-sm font-medium text-red-700">As inscrições deste curso estão encerradas.</p>}
          <AddToCartButton product={product} className="mt-8 w-full py-3 sm:w-auto" />
          <p className="mt-4 text-xs text-gray-500">SKU {product.sku}</p>
        </div>
      </div>
    </>
  );
}
