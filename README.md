# ModernStore

A demo e-commerce store for digital products (templates, UI kits, courses, ebooks), built with **Next.js 14 (App Router) + TypeScript + Tailwind**. The storefront follows the look of Shopify's Dawn theme (Assistant typeface, square buttons, borderless cards, cart notification), and checkout follows the two-column hosted-checkout layout. The catalog, reviews and order history are generated data; checkout is simulated and never charges anyone. The goal is to show how a store should be wired: server-side pricing, consent-gated analytics, a real admin session, SEO, and data that adds up.

## Run it

```bash
npm ci
npm run dev          # http://localhost:3000
```

Every environment variable is optional (see [`.env.example`](.env.example)); without them the store runs in demo mode with admin, analytics and email disabled.

| Command | What it does |
| --- | --- |
| `npm test` | Seed integrity, order validation, admin tokens, email escaping (`node:test` via `tsx`) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / `next lint` |
| `npm run build && npm start` | Production build |
| `npm run seed` | Regenerate `src/data/*.json` and the product SVGs (deterministic) |

## What's in it

- **Catalog**: search, category filter, sort and pagination through URL query params. The filter form is a plain GET form, so it works without JavaScript and every result page is shareable. Product pages are statically generated with metadata, canonical URLs and Product JSON-LD.
- **Cart**: one React context backed by `localStorage`, synced across tabs through the `storage` event. It stores only product ids and quantities; prices always come from the catalog.
- **Checkout**: `POST /api/orders` accepts ids and quantities only, validates everything (email, payment method, quantity 1–10, at most 20 lines, no duplicates, product exists and is available, 10 kB body cap) and **recalculates prices, tax and total on the server**. A tampered request can change what is bought, never what it costs. Money is integer cents end to end; the 18% tax is rounded once on the subtotal.
- **Admin** (`/admin`): password checked on the server against `ADMIN_PASSWORD`, then an HMAC-signed, `HttpOnly`, `SameSite=Lax` cookie that expires in 2 hours. The dashboard and `/api/analytics` are derived from the order data, so revenue, AOV and top products always reconcile.
- **Analytics**: GA4 and/or GTM load only after the visitor accepts the consent banner. Events (`view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `purchase`) follow the GA4 e-commerce schema in BRL and never include name or email. If both IDs are set, events go through GTM only, so nothing is counted twice. `purchase` fires once, right after the server confirms the order, so reloading the receipt doesn't repeat it.
- **Email**: after an order is created, the server sends a confirmation through the Resend HTTP API when `RESEND_API_KEY` and `EMAIL_FROM` are set. User input is HTML-escaped. There is no public "send email" endpoint. A failed or unconfigured email never fails the checkout, and the receipt page says which of the two happened.

## Demo data

`src/data/generate.mjs` builds the dataset from a fixed seed (`20260601`). The same seed always produces the same bytes:

- 52 products across 4 categories, each with its own local SVG cover. Two courses are "enrollment closed" so the unavailable path is real.
- 120 fictional customers, all on `example.com`.
- 240 orders between 2026-06-01 and 2026-08-31. Volume grows over the quarter and is lower on weekends and overnight (BRT). Best sellers follow review counts. About 3% are refunded, and recent boleto orders are still pending.
- Conversion rate = orders / **8,420 declared sessions**. That session count is an input, not a measurement, and the dashboard says so.

Ratings and review counts are labeled as demo data in the UI and deliberately left out of the JSON-LD, because review markup that isn't backed by real reviews breaks Google's guidelines.

## Limits

- **No database.** Orders placed in the demo are returned to the browser as a receipt and stored in `localStorage`. The receipt page and the admin's "Placed from this browser" list work only in that browser. `GET /api/orders/:id` serves the seed orders only. Nothing is kept in server memory, because on serverless it would disappear between instances. Shared persistence would need a real database, and then order status changes in the admin.
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

1. Import the repository into Vercel. The defaults work (`npm run build`).
2. Set `SITE_URL` to the production URL. Optionally set `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (32+ random characters), `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA4_ID`, `RESEND_API_KEY` and `EMAIL_FROM` (on a domain verified in Resend).
3. With GTM, add a GA4 Configuration tag plus a GA4 Event tag triggered by the e-commerce events, with "Send e-commerce data" set to the Data Layer.

## Presenting it honestly

> A Next.js 14 store for digital products. The data is generated, the payment is simulated, and the README says both. What's real: prices are computed on the server, so a tampered request can't change a price. The GA4 e-commerce events wait for consent and are sent through a single path. The admin uses a signed HttpOnly cookie instead of a flag in localStorage. The dashboard numbers are derived from the orders, so they reconcile. Going to production would mean a database for orders plus a payment provider's webhook to mark them paid. Everything else stays the same.
