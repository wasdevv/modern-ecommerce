import { NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/payments/service';

// The signature covers the exact bytes received, so the body is read as text, never re-serialized.
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 50_000) return NextResponse.json({ error: 'too large' }, { status: 413 });
  const result = await handleWebhook(raw, request.headers);
  return NextResponse.json(result.body, { status: result.status });
}
