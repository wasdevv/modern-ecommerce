export const CATEGORIES = ['templates', 'ui-kits', 'courses', 'ebooks'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_METHODS = ['card', 'pix', 'boleto'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Money is always integer cents; only format.ts turns it into text.
export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  originalPriceCents?: number;
  category: Category;
  image: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  sku: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Order {
  id: string;
  customerId: string | null;
  name: string;
  email: string;
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  status: 'pending' | 'completed' | 'refunded';
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export type EmailStatus = 'sent' | 'not_configured' | 'failed';

export interface Receipt extends Order {
  emailStatus: EmailStatus;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface DatasetMeta {
  seed: number;
  periodStart: string;
  periodEnd: string;
  simulatedSessions: number;
}
