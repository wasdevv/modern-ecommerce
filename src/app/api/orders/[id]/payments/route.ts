import { NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { error, readJson } from '@/lib/http';
import { startPayment } from '@/lib/payments/service';

// Body: { method: "pix" } or { method: "card", cardToken }. The card number never reaches this endpoint.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!dbConfigured()) return error(503, 'Banco de dados não configurado (DATABASE_URL)');
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const { method, cardToken } = (parsed.body ?? {}) as Record<string, unknown>;
  if (method !== 'pix' && method !== 'card') return error(400, 'Forma de pagamento desconhecida');
  if (method === 'card' && typeof cardToken !== 'string') return error(400, 'cardToken é obrigatório para cartão');

  const result = await startPayment(params.id, method, method === 'card' ? (cardToken as string) : undefined);
  if (!result.ok) return error(result.status, result.error);
  return NextResponse.json(result.payment, { status: 201 });
}
