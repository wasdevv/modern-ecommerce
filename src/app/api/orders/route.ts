import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/store';
import { sendConfirmation } from '@/lib/email';
import type { Receipt } from '@/lib/types';

const MAX_BODY_BYTES = 10_000;

// There is no database: the order is validated and priced here, returned as a receipt,
// and the browser keeps it. Nothing is stored server-side, so nothing is lost between serverless instances.
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Requisição grande demais' }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'JSON malformado' }, { status: 400 });
  }

  const result = createOrder(body, `ord_${randomUUID()}`, new Date());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  // An email failure is reported, never turned into a failed checkout.
  const receipt: Receipt = { ...result.value, emailStatus: await sendConfirmation(result.value) };
  return NextResponse.json(receipt, { status: 201 });
}
