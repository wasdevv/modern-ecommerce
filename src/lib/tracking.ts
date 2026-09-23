import type { Product } from './types';

// One delivery path so events are never counted twice:
// GTM configured → dataLayer (the GA4 tag lives inside GTM); else GA4 → gtag; else nothing.
// Nothing is sent before consent, and no PII (name/email) is ever included.
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';
export const CONSENT_KEY = 'analytics_consent';

export interface TrackItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number; // GA4 expects currency units, not cents
  quantity: number;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function hasConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export const toItem = (p: Pick<Product, 'id' | 'name' | 'category' | 'priceCents'>, quantity = 1): TrackItem => ({
  item_id: p.id,
  item_name: p.name,
  item_category: p.category,
  price: p.priceCents / 100,
  quantity,
});

export function track(event: string, params: { items: TrackItem[]; value?: number; transaction_id?: string; tax?: number }) {
  if (typeof window === 'undefined' || !hasConsent()) return;
  const payload = { currency: 'BRL', ...params };
  if (GTM_ID) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null }); // clear the previous ecommerce object, per GTM docs
    window.dataLayer.push({ event, ecommerce: payload });
  } else if (GA4_ID && window.gtag) {
    window.gtag('event', event, payload);
  }
}
