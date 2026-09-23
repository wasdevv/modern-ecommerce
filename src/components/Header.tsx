'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useCart } from './CartProvider';
import { BagIcon, CheckIcon, CloseIcon, MenuIcon, SearchIcon } from './Icons';
import { getProduct } from '@/lib/catalog';

const NAV = [
  { href: '/', label: 'Início', active: (p: string) => p === '/' },
  { href: '/products', label: 'Catálogo', active: (p: string) => p.startsWith('/products') },
];

export default function Header() {
  const pathname = usePathname();
  const { count, hydrated, lastAdded, dismissNotice } = useCart();
  const headerRef = useRef<HTMLElement>(null);
  const noticeRef = useRef<HTMLHeadingElement>(null);

  // <details> panels and the notification stay open across client navigations unless closed here.
  useEffect(() => {
    headerRef.current?.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
    dismissNotice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!lastAdded) return;
    noticeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissNotice();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lastAdded, dismissNotice]);

  const added = lastAdded && getProduct(lastAdded.productId);

  return (
    <header ref={headerRef} className="sticky top-0 z-30 border-b border-ink/10 bg-white">
      <div className="page-width grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[88px] md:grid-cols-[auto_1fr_auto] md:gap-10">
        <details className="group md:hidden">
          <summary className="-ml-2 flex h-11 w-11 cursor-pointer list-none items-center justify-center text-ink [&::-webkit-details-marker]:hidden" aria-label="Menu">
            <MenuIcon />
          </summary>
          <nav className="absolute inset-x-0 top-full border-b border-ink/10 bg-white py-4 shadow-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`block px-6 py-3 text-lg ${n.active(pathname) ? 'text-ink underline underline-offset-4' : 'text-ink/75'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </details>

        <Link href="/" className="justify-self-center text-2xl text-ink md:justify-self-start">
          ModernStore
        </Link>

        <nav className="hidden gap-1 md:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={n.active(pathname) ? 'page' : undefined}
              className={`px-3 py-3 text-sm hover:text-ink hover:underline hover:underline-offset-4 ${n.active(pathname) ? 'text-ink underline underline-offset-4' : 'text-ink/75'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-self-end">
          <details className="group">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center text-ink transition-transform hover:scale-105 [&::-webkit-details-marker]:hidden" aria-label="Buscar">
              <SearchIcon />
            </summary>
            <div className="absolute inset-x-0 top-0 z-40 flex h-16 items-center border-b border-ink/10 bg-white md:h-[88px]">
              <form action="/products" className="page-width flex items-center gap-4">
                <div className="relative flex-1 md:mx-auto md:max-w-3xl">
                  <input id="header-search" name="search" type="search" placeholder="Buscar" autoFocus className="field peer" />
                  <label htmlFor="header-search" className="field-label">
                    Buscar
                  </label>
                </div>
                <button
                  type="button"
                  onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}
                  className="flex h-11 w-11 items-center justify-center text-ink"
                  aria-label="Fechar busca"
                >
                  <CloseIcon />
                </button>
              </form>
            </div>
          </details>
          <Link href="/cart" className="relative -mr-2 flex h-11 w-11 items-center justify-center text-ink transition-transform hover:scale-105" aria-label={`Carrinho${hydrated && count ? `, ${count} itens` : ''}`}>
            <BagIcon />
            {hydrated && count > 0 && (
              <span className="absolute bottom-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[9px] leading-none tracking-normal text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {added && (
        <div role="dialog" aria-labelledby="cart-notice-title" className="absolute right-0 top-full z-40 w-full border border-t-0 border-ink/10 bg-white px-6 pb-8 pt-6 shadow-[0_8px_24px_rgba(18,18,18,0.08)] md:right-12 md:w-[380px]">
          <div className="flex items-center justify-between">
            <h2 id="cart-notice-title" ref={noticeRef} tabIndex={-1} className="flex items-center gap-2 text-sm text-ink outline-none">
              <CheckIcon /> Item adicionado ao carrinho
            </h2>
            <button onClick={dismissNotice} className="-mr-2 flex h-9 w-9 items-center justify-center text-ink" aria-label="Fechar">
              <CloseIcon />
            </button>
          </div>
          <div className="mt-5 flex gap-4">
            <Image src={added.image} alt="" width={70} height={70} className="bg-mist" />
            <p className="text-[15px] text-ink">
              {added.name}
              <span className="block text-sm text-ink/75">Qtd: {lastAdded.quantity}</span>
            </p>
          </div>
          <div className="mt-6 grid gap-3">
            <Link href="/cart" className="btn-outline">
              Ver carrinho ({count})
            </Link>
            <Link href="/checkout" className="btn">
              Finalizar compra
            </Link>
            <button onClick={dismissNotice} className="link mx-auto mt-1 text-sm">
              Continuar comprando
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
