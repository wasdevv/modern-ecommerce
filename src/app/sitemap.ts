import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/format';
import { products } from '@/lib/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base },
    { url: `${base}/products` },
    ...products.map((p) => ({ url: `${base}/products/${p.id}` })),
  ];
}
