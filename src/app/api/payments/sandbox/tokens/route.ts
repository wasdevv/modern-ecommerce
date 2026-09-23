import { NextResponse } from 'next/server';
import { error, readJson } from '@/lib/http';
import { tokenizeCard } from '@/lib/payments/sandbox';

// The sandbox gateway's tokenization endpoint. With a real gateway this call goes from the browser
// straight to the gateway (its JS SDK), and the store's servers never see the card number.
// This handler never logs or stores the request body.
export async function POST(request: Request) {
  if ((process.env.PAYMENT_PROVIDER || 'sandbox') !== 'sandbox') return error(404, 'Not found');
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const result = tokenizeCard(parsed.body);
  if (!result.ok) return error(400, result.error);
  return NextResponse.json({ token: result.token, brand: result.brand, last4: result.last4 }, { status: 201 });
}
