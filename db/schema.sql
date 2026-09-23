-- Idempotent: safe to run on every deploy (`npm run db:migrate`).

CREATE TABLE IF NOT EXISTS orders (
  id              text PRIMARY KEY,
  -- Same key on a retried POST returns the same order instead of creating a second one.
  idempotency_key text NOT NULL UNIQUE,
  name            text NOT NULL,
  email           text NOT NULL,
  items           jsonb NOT NULL,
  subtotal_cents  integer NOT NULL CHECK (subtotal_cents > 0),
  tax_cents       integer NOT NULL CHECK (tax_cents >= 0),
  total_cents     integer NOT NULL CHECK (total_cents = subtotal_cents + tax_cents),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  email_status    text CHECK (email_status IN ('sent', 'not_configured', 'failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz
);

-- One row per attempt: a declined card followed by a Pix is two payments on the same order.
CREATE TABLE IF NOT EXISTS payments (
  id             text PRIMARY KEY,
  order_id       text NOT NULL REFERENCES orders(id),
  provider       text NOT NULL,
  method         text NOT NULL CHECK (method IN ('pix', 'card')),
  amount_cents   integer NOT NULL CHECK (amount_cents > 0),
  status         text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'expired', 'cancelled')),
  provider_ref   text,
  failure_reason text,
  pix_code       text,
  card_brand     text,
  card_last4     text,
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments (order_id);
-- At most one successful payment per order, enforced by the database, not by app code.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_success_per_order ON payments (order_id) WHERE status = 'succeeded';

-- Webhook deliveries are at-least-once; the event id makes processing exactly-once.
CREATE TABLE IF NOT EXISTS webhook_events (
  id          text PRIMARY KEY,
  provider    text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
