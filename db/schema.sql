-- Neon SQL Editor'de çalıştır (tekrar çalıştırmak güvenlidir). Tutarlar KURUŞ cinsindendir.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), oid TEXT UNIQUE NOT NULL,
  method TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  link TEXT NOT NULL, quantity INTEGER NOT NULL, cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_order TEXT;
CREATE TABLE IF NOT EXISTS sms_orders (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  product TEXT NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'buying',
  phone TEXT, code TEXT, provider_id TEXT, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE sms_orders ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS receipt TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS receipt_type TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS sms_user ON sms_orders(user_id);
