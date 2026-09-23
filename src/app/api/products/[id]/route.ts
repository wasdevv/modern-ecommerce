import { NextResponse } from 'next/server';
import { getProduct } from '@/lib/store';

export function GET(_request: Request, { params }: { params: { id: string } }) {
  const product = getProduct(params.id);
  if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json(product);
}
