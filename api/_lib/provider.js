// Tedarikçi (SMM panel) bağlantısı — standart v2 API: action=add / status
const cfg = require('./config');
const URL_ = () => String(process.env.PROVIDER_API_URL || cfg.PROVIDER_API_URL || '').trim();
const KEY = () => String(process.env.PROVIDER_API_KEY || cfg.PROVIDER_API_KEY || '').trim();
const serviceId = (id) => String((cfg.SERVICE_IDS || {})[id] || '').trim();
const ready = (id) => !!(URL_() && KEY() && serviceId(id));

async function call(params) {
  const r = await fetch(URL_(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key: KEY(), ...params }).toString(),
    signal: AbortSignal.timeout(15000)
  });
  const j = await r.json();
  if (!r.ok || (j && j.error)) throw new Error((j && j.error) || ('Tedarikçi hatası ' + r.status));
  return j;
}

// Siparişi tedarikçiye gönderir → tedarikçi sipariş numarası
async function add(id, link, quantity) {
  const j = await call({ action: 'add', service: serviceId(id), link, quantity: String(quantity) });
  if (!j.order) throw new Error('Tedarikçi sipariş numarası vermedi.');
  return String(j.order);
}

// Birden çok siparişin durumu → { [providerOrderId]: { status, remains } }
async function statuses(ids) {
  if (!ids.length) return {};
  const j = await call({ action: 'status', orders: ids.join(',') });
  return j || {};
}

module.exports = { ready, add, statuses };
