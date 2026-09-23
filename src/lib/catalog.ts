import productsJson from '@/data/products.json';
import type { Product } from './types';

// Split from store.ts so client components can look up products without bundling 240 orders.
export const products = productsJson as Product[];
const byId = new Map(products.map((p) => [p.id, p]));
export const getProduct = (id: string) => byId.get(id);
