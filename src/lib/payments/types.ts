// The seam between the store and a payment gateway. The sandbox implements it today;
// a real gateway (Mercado Pago, Stripe, Pagar.me) is another implementation selected by PAYMENT_PROVIDER.

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled';

export interface PixCharge {
  providerRef: string;
  pixCode: string;
  expiresAt: Date;
}

export interface CardCharge {
  providerRef: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
  brand: string;
  last4: string;
}

// What a verified webhook tells us, already translated out of the provider's own format.
export interface PaymentEvent {
  eventId: string;
  providerRef: string;
  status: 'succeeded' | 'failed';
  amountCents: number;
}

export interface PaymentProvider {
  name: string;
  createPix(input: { paymentId: string; amountCents: number }): Promise<PixCharge>;
  // Receives a token from the provider's tokenization step, never a card number.
  chargeCard(input: { paymentId: string; amountCents: number; cardToken: string }): Promise<CardCharge>;
  cancel(providerRef: string): Promise<void>;
  // Returns null when the signature or timestamp doesn't check out.
  parseWebhook(rawBody: string, headers: Headers): PaymentEvent | null;
}
