# ModernStore

A demo e-commerce store for digital products (templates, UI kits, courses, ebooks), built with **Next.js 14 (App Router) + TypeScript + Tailwind**. The storefront follows the look of Shopify's Dawn theme (Assistant typeface, square buttons, borderless cards, cart notification), and checkout follows the two-column hosted-checkout layout. The catalog, reviews and order history are generated data. Payments go through a built-in **sandbox gateway** (Pix and card) that behaves like a real one and never charges anyone. The goal is to show how a store should be wired: server-side pricing, a payment state machine driven by signed webhooks, consent-gated analytics, a real admin session, SEO, and data that adds up.

Full write-up (in Portuguese) of everything built, the decisions and the verification: [`docs/DESENVOLVIMENTO.md`](docs/DESENVOLVIMENTO.md).

## Run it

```bash
npm ci
docker compose up -d                  # Postgres 16 on localhost:5434
cp .env.example .env.local            # then fill DATABASE_URL (the compose URL is in the file)
npm run db:migrate
npm run dev                           # http://localhost:3000
```

Only `DATABASE_URL` is required to check out. The other variables in [`.env.example`](.env.example) turn on admin, analytics and email.

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests: seed integrity, order validation, admin tokens, BR Code, card tokens, webhook signatures (`node:test` via `tsx`) |
| `npm run test:db` | Payment integration tests against Postgres (`modernstore_test` database; override with `TEST_DATABASE_URL`) |
| `npm run db:migrate` | Applies `db/schema.sql` (idempotent) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / `next lint` |
| `npm run build && npm start` | Production build |
| `npm run seed` | Regenerate `src/data/*.json` and the product SVGs (deterministic) |

## What's in it

- **Catalog**: search, category filter, sort and pagination through URL query params. The filter form is a plain GET form, so it works without JavaScript and every result page is shareable. Product pages are statically generated with metadata, canonical URLs and Product JSON-LD.
- **Cart**: one React context backed by `localStorage`, synced across tabs through the `storage` event. It stores only product ids and quantities; prices always come from the catalog.
- **Checkout**: `POST /api/orders` accepts ids and quantities only, validates everything (email, quantity 1–10, at most 20 lines, no duplicates, product exists and is available, 10 kB body cap) and **recalculates prices, tax and total on the server**. A tampered request can change what is bought, never what it costs. Money is integer cents end to end; the 18% tax is rounded once on the subtotal.
- **Admin** (`/admin`): password checked on the server against `ADMIN_PASSWORD`, then an HMAC-signed, `HttpOnly`, `SameSite=Lax` cookie that expires in 2 hours. The dashboard and `/api/analytics` are derived from the order data, so revenue, AOV and top products always reconcile.
- **Analytics**: GA4 and/or GTM load only after the visitor accepts the consent banner. Events (`view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `purchase`) follow the GA4 e-commerce schema in BRL and never include name or email. If both IDs are set, events go through GTM only, so nothing is counted twice. `purchase` fires once per order, only after the payment is confirmed and only in the browser that placed the order, so a reload or a Pix confirmed later can't count the sale twice.
- **Email**: after a payment is confirmed, the server sends a confirmation through the Resend HTTP API when `RESEND_API_KEY` and `EMAIL_FROM` are set. User input is HTML-escaped. There is no public "send email" endpoint. A failed or unconfigured email never fails the checkout, and the receipt page says which of the two happened.

## Payments

```
browser ──card data──▶ /api/payments/sandbox/tokens   (the gateway's tokenization; returns tok_…)
browser ──ids, qty───▶ POST /api/orders                (Idempotency-Key → order "pending")
browser ──token/pix──▶ POST /api/orders/:id/payments   (payment attempt)
gateway ──signed─────▶ POST /api/webhooks/payments     (Pix confirmation → order "paid")
```

- **`PaymentProvider` interface** (`src/lib/payments/types.ts`). The sandbox is the only implementation. A real gateway (Mercado Pago, Stripe, Pagar.me) is another implementation selected with `PAYMENT_PROVIDER`; the order code doesn't change.
- **Card numbers never reach the order API.** The browser exchanges the card for a signed, short-lived token first, like a gateway's JS SDK would. The sandbox accepts only its test cards, so nobody types a real card into a demo:

  | Card | Result |
  | --- | --- |
  | `4242 4242 4242 4242` / `5555 5555 5555 4444` | Approved |
  | `4000 0000 0000 0002` | Declined |
  | `4000 0000 0000 9995` | Insufficient funds |

  Any future expiry date and any CVV work. The checkout lists these cards and fills them in with one click.
- **Pix** returns a real-format BR Code (EMV fields and CRC16, checked against the example in the Banco Central manual) plus a QR code, and it expires in 30 minutes. The Pix key is on the reserved `.invalid` domain, so no banking app can pay it. "Simular pagamento" plays the payer's bank: the sandbox sends a signed webhook, and the order page picks up the change by polling, even in another tab.
- **The state machine is enforced in one place** (`settle` in `service.ts`). A payment leaves `pending` exactly once (`succeeded`, `failed`, `expired`, `cancelled`), under a row lock. Postgres also enforces at most one successful payment per order with a partial unique index.
- **Webhooks** are HMAC-signed over timestamp + raw body, rejected after 5 minutes, and deduplicated by event id in the same transaction that applies them. An amount that doesn't match the payment is ignored.
- **Retries.** A declined card keeps the same order, so the next attempt pays that order. A new attempt cancels any open Pix, so paying the old code later doesn't count; a real integration would refund it. An expired Pix can't be paid, and the order page offers a new one. Paid orders refuse new payments.
- Expiry is applied lazily on read, so no scheduler is needed.

## Demo data

`src/data/generate.mjs` builds the dataset from a fixed seed (`20260601`). The same seed always produces the same bytes:

- 52 products across 4 categories, each with its own local SVG cover. Two courses are "enrollment closed" so the unavailable path is real.
- 120 fictional customers, all on `example.com`.
- 240 orders between 2026-06-01 and 2026-08-31. Volume grows over the quarter and is lower on weekends and overnight (BRT). Best sellers follow review counts. About 3% are refunded, and recent boleto orders are still pending.
- Conversion rate = orders / **8,420 declared sessions**. That session count is an input, not a measurement, and the dashboard says so.

Ratings and review counts are labeled as demo data in the UI and deliberately left out of the JSON-LD, because review markup that isn't backed by real reviews breaks Google's guidelines.

## Limits

- **Orders placed in the store live in Postgres; the 240 historical orders are seed JSON** and feed the dashboard. The admin lists both and has no status-editing actions.
- **The receipt URL is the secret.** Order ids are random UUIDs and `/order/:id` needs no login, the same trade-off as a hosted checkout's thank-you link.
- **The sandbox is the only payment provider.** `SANDBOX_SECRET` is required in production builds.
- **The admin login has no rate limiting.** Use a long random password. If the admin is ever exposed with real data, add rate limiting.
- **`SITE_URL` is read at build time** for the statically generated pages (product JSON-LD, sitemap, robots). Set it before `npm run build`.
- The UI is in Brazilian Portuguese and prices are in BRL. Product names stay in English, as they usually do for developer products.

## Measured performance

Lighthouse 12, production build (`next start`) on localhost, no analytics IDs configured:

| Page | Mobile (perf / a11y / best practices / SEO) | Desktop | Mobile LCP |
| --- | --- | --- | --- |
| `/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 1.9 s |
| `/products` | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 2.2 s |
| `/products/prod_001` | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 2.1 s |
| `/cart`, `/checkout` | 98–99 / 100 / 100 / 63 | 100 / 100 / 100 / 63 | 2.3 s |

CLS is at most 0.015. Cart and checkout score 63 on SEO because they are `noindex` on purpose.

These are local numbers. A deployed site will differ, so measure it again after deploying.

## Deploying (Vercel)

1. Create a Postgres database (Neon or Supabase both have a free tier) and run `DATABASE_URL=… npm run db:migrate` against it.
2. Import the repository into Vercel. The defaults work (`npm run build`).
3. Set `DATABASE_URL`, `SANDBOX_SECRET` and `SITE_URL`. Optionally set `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (32+ random characters), `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA4_ID`, `RESEND_API_KEY` and `EMAIL_FROM` (on a domain verified in Resend).
4. With GTM, add a GA4 Configuration tag plus a GA4 Event tag triggered by the e-commerce events, with "Send e-commerce data" set to the Data Layer.

## Presenting it honestly

> A Next.js 14 store for digital products. The catalog data is generated, and payments run through a sandbox gateway that never charges anyone. The README says both. What's real: prices are computed on the server, so a tampered request can't change a price. The GA4 e-commerce events wait for consent and are sent through a single path. The admin uses a signed HttpOnly cookie instead of a flag in localStorage. The dashboard numbers are derived from the orders, so they reconcile. Orders and payments live in Postgres. The payment runs through a gateway interface, and only a signed webhook can mark an order paid. Card numbers are tokenized before the store sees them. The sandbox gateway is the only part that's fake, and swapping it for Mercado Pago or Stripe means writing one adapter.
