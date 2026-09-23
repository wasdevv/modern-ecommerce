import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { error, readJson } from '@/lib/http';
import { insertOrder } from '@/lib/payments/service';
import { createOrder } from '@/lib/store';

// Creates the order as "pending". Paying it is a separate call (POST /api/orders/:id/payments),
// so a declined card can be retried, or switched to Pix, without creating a second order.
export async function POST(request: Request) {
  if (!dbConfigured()) return error(503, 'Banco de dados não configurado (DATABASE_URL)');
  const key = request.headers.get('idempotency-key');
  if (!key || !/^[A-Za-z0-9-]{16,64}$/.test(key)) return error(400, 'Cabeçalho Idempotency-Key ausente ou inválido');

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const priced = createOrder(parsed.body, `ord_${randomUUID()}`, new Date());
  if (!priced.ok) return error(priced.status, priced.error);

  const saved = await insertOrder(priced.value, key);
  if (!saved.ok) return error(saved.status, saved.error);
  return NextResponse.json({ id: saved.id }, { status: 201 });
}
