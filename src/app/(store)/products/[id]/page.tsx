import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronIcon } from '@/components/Icons';
import Price from '@/components/Price';
import ProductCard from '@/components/ProductCard';
import ProductForm from '@/components/ProductForm';
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

const FORMAT: Record<string, string> = {
  templates: 'Código-fonte (Next.js + Tailwind), acesso ao repositório',
  'ui-kits': 'Arquivo Figma + pacote de componentes React',
  courses: 'Aulas em vídeo com código-fonte, acesso vitalício',
  ebooks: 'PDF e EPUB',
};

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getProduct(params.id);
  if (!product) notFound();
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

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

      <div className="page-width grid gap-8 pb-12 pt-6 md:grid-cols-[55%_1fr] md:gap-16 md:pt-12">
        <div className="relative aspect-square bg-mist md:sticky md:top-28 md:self-start">
          <Image src={product.image} alt={product.name} fill priority sizes="(min-width: 750px) 55vw, 100vw" className="object-cover" />
        </div>

        <div className="md:max-w-[480px]">
          <p className="caption">{CATEGORY_LABELS[product.category]}</p>
          <h1 className="mt-2 text-[32px] md:text-[40px]">{product.name}</h1>
          <div className="mt-4">
            <Price product={product} large badge />
          </div>
          <p className="mt-1 text-[13px]">Impostos (18%) calculados no checkout.</p>
          <p className="mt-3 text-[13px]">
            <span className="text-ink">★ {formatRating(product.rating)}</span> · {product.reviewCount} avaliações (dados de demonstração)
          </p>

          <ProductForm product={product} />

          <p className="mt-8 max-w-prose">{product.description}</p>

          <div className="mt-8 border-t border-ink/10">
            {[
              ['Detalhes do produto', [`Formato: ${FORMAT[product.category]}`, `SKU: ${product.sku}`, 'Entrega: digital, logo após a confirmação']],
            ].map(([title, items]) => (
              <details key={title as string} className="group border-b border-ink/10">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] text-ink [&::-webkit-details-marker]:hidden">
                  {title}
                  <ChevronIcon className="h-3 w-3 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-1 pb-5 text-sm">
                  {(items as string[]).map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      </div>

      <section className="page-width py-12 md:py-16">
        <h2 className="text-2xl">Você também pode gostar</h2>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} quickAdd={false} />
          ))}
        </div>
      </section>
    </>
  );
}
