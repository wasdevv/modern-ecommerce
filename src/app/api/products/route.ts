import { NextRequest, NextResponse } from 'next/server';
import { parseProductQuery, queryProducts } from '@/lib/store';

export function GET(request: NextRequest) {
  const parsed = parseProductQuery(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  return NextResponse.json(queryProducts(parsed.value));
}
