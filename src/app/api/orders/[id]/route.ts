import { NextResponse } from 'next/server';
import { getSeedOrder } from '@/lib/store';

// Only the fictional seed orders are served; orders placed in the demo live in the buyer's browser.
export function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = getSeedOrder(params.id);
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  return NextResponse.json(order);
}
