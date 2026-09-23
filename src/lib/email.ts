import type { EmailStatus, Order } from './types';
import { formatBRL, siteUrl } from './format';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function confirmationHtml(order: Order) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escape(i.productName)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatBRL(i.totalCents)}</td></tr>`,
    )
    .join('');
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
<h1 style="font-size:20px">Order ${escape(order.id)} received</h1>
<p>Hi ${escape(order.name)}, this is a demo store: no payment was charged.</p>
<table style="width:100%;border-collapse:collapse">${rows}</table>
<p style="text-align:right">Subtotal ${formatBRL(order.subtotalCents)}<br>Tax ${formatBRL(order.taxCents)}<br><strong>Total ${formatBRL(order.totalCents)}</strong></p>
<p><a href="${siteUrl()}/order/${encodeURIComponent(order.id)}">View your order</a> (the link works in the browser you ordered from).</p>
</div>`;
}

// Called by the order route only; there is no public "send email" endpoint to abuse.
export async function sendConfirmation(order: Order): Promise<EmailStatus> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return 'not_configured';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: order.email, subject: `Order ${order.id} received`, html: confirmationHtml(order) }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return 'sent';
    console.error('Resend rejected the email', res.status, await res.text());
  } catch (error) {
    console.error('Resend request failed', error);
  }
  return 'failed';
}
