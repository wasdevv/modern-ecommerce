import type { Receipt } from './types';

// Orders placed in the demo are kept only in this browser (see README: "Persistence").
const KEY = 'receipts';

export function listReceipts(): Record<string, Receipt> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveReceipt(receipt: Receipt) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...listReceipts(), [receipt.id]: receipt }));
  } catch {
    // Storage unavailable (private mode, quota): the confirmation page will say the receipt is missing.
  }
}
