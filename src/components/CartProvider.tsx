'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProduct } from '@/lib/catalog';
import { MAX_QUANTITY } from '@/lib/limits';
import type { CartLine } from '@/lib/types';

const KEY = 'cart';

// Only ids and quantities are stored; prices are always read from the catalog,
// so a stale or edited localStorage entry can't change what anything costs.
function readCart(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l?.productId === 'string' &&
        Number.isInteger(l.quantity) &&
        l.quantity >= 1 &&
        l.quantity <= MAX_QUANTITY &&
        !!getProduct(l.productId),
    );
  } catch {
    return [];
  }
}

interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  subtotalCents: number;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read after mount (not during render) so server and client HTML match.
  useEffect(() => {
    setLines(readCart());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(readCart());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((fn: (current: CartLine[]) => CartLine[]) => {
    setLines((current) => {
      const next = fn(current);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the cart still works for this tab.
      }
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const clamp = (q: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(q)));
    return {
      lines,
      hydrated,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotalCents: lines.reduce((sum, l) => sum + (getProduct(l.productId)?.priceCents ?? 0) * l.quantity, 0),
      add: (productId, quantity = 1) =>
        update((cur) =>
          cur.some((l) => l.productId === productId)
            ? cur.map((l) => (l.productId === productId ? { ...l, quantity: clamp(l.quantity + quantity) } : l))
            : [...cur, { productId, quantity: clamp(quantity) }],
        ),
      setQuantity: (productId, quantity) =>
        update((cur) => cur.map((l) => (l.productId === productId ? { ...l, quantity: clamp(quantity) } : l))),
      remove: (productId) => update((cur) => cur.filter((l) => l.productId !== productId)),
      clear: () => update(() => []),
    };
  }, [lines, hydrated, update]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
