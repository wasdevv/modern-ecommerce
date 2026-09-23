// Shared by the cart (client) and order validation (server).
export const MAX_LINES = 20;
export const MAX_QUANTITY = 10;
export const TAX_RATE = 0.18;

// Tax is rounded once on the subtotal, never per line.
export const taxFor = (subtotalCents: number) => Math.round(subtotalCents * TAX_RATE);
