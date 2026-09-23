import { NextResponse } from 'next/server';
import { error } from '@/lib/http';
import { sendPixPaidWebhook } from '@/lib/payments/sandbox';
import { pendingPix } from '@/lib/payments/service';

// Plays the buyer's bank app paying the Pix. The store learns about it only through the signed
// webhook, exactly as it would from a real gateway, so the webhook path is what gets exercised.
export async function POST(request: Request, { params }: { params: { paymentId: string } }) {
  if ((process.env.PAYMENT_PROVIDER || 'sandbox') !== 'sandbox') return error(404, 'Not found');
  const pix = await pendingPix(params.paymentId);
  if (!pix.ok) return error(pix.status, pix.error);
  const status = await sendPixPaidWebhook(new URL(request.url).origin, pix.providerRef, pix.amountCents);
  if (status !== 200) return error(502, `O webhook respondeu ${status}`);
  return NextResponse.json({ paid: true });
}
