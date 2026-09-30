// Neon bağlantısı (tembel). Tablolar ilk istekte otomatik oluşturulur → schema.sql'i elle çalıştırmaya gerek yok.
const { neon } = require('@neondatabase/serverless');
let client = null, ready = null;

// Yapıştırma hatalarını temizler: tırnaklar, baştaki "psql", boşluklar
function dbUrl() {
  let u = String(process.env.DATABASE_URL || require('./config').DATABASE_URL || '').trim();
  u = u.replace(/^psql\s+/i, '').replace(/^['"]+|['"]+$/g, '').trim();
  return u;
}
function getClient() {
  const u = dbUrl();
  if (!u) { const e = new Error('DATABASE_URL yok'); e.code = 'NO_DB'; throw e; }
  if (!/^postgres(ql)?:\/\//i.test(u)) { const e = new Error('DATABASE_URL gecersiz'); e.code = 'BAD_DB_URL'; throw e; }
  if (!client) client = neon(u);
  return client;
}

async function setup(c) {
  await c`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await c`CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), oid TEXT UNIQUE NOT NULL,
    method TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await c`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    link TEXT NOT NULL, quantity INTEGER NOT NULL, cost INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await c`ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_id TEXT`;
  await c`ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_name TEXT`;
  await c`ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_order TEXT`;
  await c`CREATE TABLE IF NOT EXISTS sms_orders (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    product TEXT NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'buying',
    phone TEXT, code TEXT, provider_id TEXT, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await c`ALTER TABLE sms_orders ADD COLUMN IF NOT EXISTS country TEXT`;
  await c`ALTER TABLE deposits ADD COLUMN IF NOT EXISTS receipt TEXT`;
  await c`ALTER TABLE deposits ADD COLUMN IF NOT EXISTS receipt_type TEXT`;
  await c`ALTER TABLE deposits ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`;
  await c`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await c`CREATE INDEX IF NOT EXISTS deposits_user ON deposits(user_id)`;
  await c`CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id)`;
  await c`CREATE INDEX IF NOT EXISTS sms_user ON sms_orders(user_id)`;
}

async function ensure() {
  if (!ready) {
    const c = getClient();
    ready = setup(c).catch(e => { ready = null; throw e; });
  }
  return ready;
}

const sql = async (strings, ...values) => { await ensure(); return getClient()(strings, ...values); };

// Hata yanıtı: sorunun ne olduğunu ekranda açıkça gösterir.
sql.fail = (res, e) => {
  console.error(e);
  if (e && e.code === 'NO_DB')
    return res.status(500).json({ error: 'Veritabanı bağlı değil. Vercel > Settings > Environment Variables bölümüne DATABASE_URL ekleyip yeniden Deploy edin.' });
  if (e && e.code === 'BAD_DB_URL')
    return res.status(500).json({ error: 'DATABASE_URL hatalı görünüyor. postgres:// ile başlayan Neon bağlantı adresinin tamamını (tırnaksız) yapıştırın.' });
  if (e && /password authentication|ENOTFOUND|fetch failed|connect|endpoint/i.test(String(e.message)))
    return res.status(500).json({ error: 'Veritabanına bağlanılamadı. DATABASE_URL değerini kontrol edin.' });
  res.status(500).json({ error: 'Sunucu hatası.' });
};
module.exports = sql;
