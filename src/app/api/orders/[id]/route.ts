import { NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { getOrderView, type OrderView } from '@/lib/payments/service';
import { getSeedOrder } from '@/lib/store';

// Order ids are random UUIDs, so the id works as the bearer secret for its own receipt page.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = dbConfigured() ? await getOrderView(params.id) : null;
  if (order) return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } });

  const seed = getSeedOrder(params.id);
  if (!seed) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  const view: OrderView = {
    ...seed,
    paidAt: null,
    emailStatus: null,
    seed: true,
    paymentMethod: seed.paymentMethod,
    payment: null,
  };
  return NextResponse.json(view);
}
