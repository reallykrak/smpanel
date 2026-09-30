// onaylasms.com.tr — SMS-Activate uyumlu API (handler_api.php). Yanıtlar düz metindir.
//   getNumber → ACCESS_NUMBER:ID:NUMARA | getStatus → STATUS_WAIT_CODE / STATUS_OK:KOD / STATUS_CANCEL
//   setStatus → 8 = iptal, 6 = tamamla | getBalance → ACCESS_BALANCE:TUTAR
const cfg = require('./config');
const URL_ = () => String(process.env.SMS_API_URL || cfg.SMS_API_URL || '').trim();
const KEY = () => String(process.env.SMS_API_KEY || cfg.SMS_API_KEY || '').trim();
const ready = () => !!(URL_() && KEY());

class SmsError extends Error { constructor(code) { super(code); this.code = code; } }

async function call(params) {
  const u = new URL(URL_());
  u.searchParams.set('api_key', KEY());
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const r = await fetch(u, { signal: AbortSignal.timeout(15000), headers: { Accept: 'text/plain,application/json' } });
  const t = (await r.text()).trim();
  if (!r.ok) throw new SmsError('HTTP_' + r.status);
  if (/^</.test(t)) throw new SmsError('BAD_RESPONSE'); // HTML / Cloudflare sayfası
  // Hata kodları iki nokta içermez: BAD_KEY, NO_NUMBERS, NO_BALANCE, BAD_SERVICE...
  if (/^[A-Z_]+$/.test(t) && !/^(STATUS|ACCESS)_/.test(t)) throw new SmsError(t);
  return t;
}

async function balance() {
  const t = await call({ action: 'getBalance' });
  const n = parseFloat(t.split(':')[1]);
  if (!isFinite(n)) throw new SmsError('BAD_RESPONSE');
  return n;
}

// → { id, phone }
async function getNumber(service, country) {
  const t = await call({ action: 'getNumber', service, country });
  const p = t.split(':');
  if (p[0] !== 'ACCESS_NUMBER' || !p[1] || !p[2]) throw new SmsError(t.slice(0, 40) || 'BAD_RESPONSE');
  return { id: p[1], phone: /^\d+$/.test(p[2]) ? '+' + p[2] : p[2] };
}

// → { state: 'wait' | 'ok' | 'cancel', code? }
async function getStatus(id) {
  const t = await call({ action: 'getStatus', id });
  if (t.startsWith('STATUS_OK')) return { state: 'ok', code: t.split(':').slice(1).join(':').trim() };
  if (t.startsWith('STATUS_CANCEL')) return { state: 'cancel' };
  if (t.startsWith('STATUS_WAIT')) return { state: 'wait' };
  throw new SmsError(t.slice(0, 40) || 'BAD_RESPONSE');
}

// 8 = iptal → true (iptal edildi / zaten iptal), hata → SmsError (örn. EARLY_CANCEL_DENIED)
async function cancel(id) {
  const t = await call({ action: 'setStatus', id, status: 8 });
  return t.startsWith('ACCESS_CANCEL');
}
// 6 = tamamla (kod alındı)
const finish = (id) => call({ action: 'setStatus', id, status: 6 });

module.exports = { ready, balance, getNumber, getStatus, cancel, finish, SmsError };
