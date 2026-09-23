'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatBRL, formatDate } from '@/lib/format';
import { listReceipts } from '@/lib/receipts';
import type { Receipt } from '@/lib/types';

// Orders placed from *this* browser. Another browser or device will not see them.
export default function LocalOrders() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  useEffect(() => setReceipts(Object.values(listReceipts()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))), []);
  if (receipts.length === 0) return null;
  return (
    <section className="mt-6 border border-dashed border-ink/20 p-4">
      <h2 className="font-semibold">Feitos neste navegador</h2>
      <ul className="mt-2 divide-y text-sm">
        {receipts.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
            <Link href={`/order/${r.id}`} className="break-all font-mono underline">{r.id}</Link>
            <span>{formatDate(r.createdAt)}</span>
            <span>{formatBRL(r.totalCents)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
