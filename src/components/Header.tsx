'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';

export default function Header() {
  const { count, hydrated } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 sm:gap-6 py-3">
        <Link href="/" className="text-base font-bold tracking-tight sm:text-lg">
          ModernStore
        </Link>
        <Link href="/products" className="text-sm text-gray-700 hover:text-gray-950">
          Produtos
        </Link>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-950">
          Admin
        </Link>
        <Link href="/cart" className="ml-auto rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
          Carrinho{hydrated && count > 0 && <span className="ml-1.5 rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white">{count}</span>}
        </Link>
      </nav>
    </header>
  );
}
