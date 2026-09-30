// SMS Onay — numara tedarikçisi: onaylasms.com.tr (SMS-Activate uyumlu API). Bkz. api/_lib/smsapi.js
const sql = require('./_lib/db');
const { getUserId } = require('./_lib/auth');
const { SMS, COUNTRIES } = require('./_lib/catalog');
const prov = require('./_lib/smsapi');

const LIFETIME_MS = 20 * 60000; // numara geçerlilik süresi
const pub = (o) => ({ id: o.id, product: o.product, country: o.country, price: o.price, status: o.status, phone: o.phone, code: o.code, expires_at: o.expires_at });
const refund = (id, uid, from, to) => sql`
  WITH s AS (UPDATE sms_orders SET status = ${to} WHERE id = ${id} AND user_id = ${uid} AND status = ${from} RETURNING user_id, price)
  UPDATE users SET balance = users.balance + s.price FROM s WHERE users.id = s.user_id RETURNING users.balance`;
const load = async (id, uid) => (await sql`SELECT * FROM sms_orders WHERE id = ${id} AND user_id = ${uid}`)[0];

module.exports = async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Giriş yapmalısınız.' });
    if (!prov.ready()) return res.status(503).json({ error: 'SMS servisi şu an aktif değil.' });

    // ── Durum sorgula (kod geldi mi?) ──
    if (req.method === 'GET') {
      const id = parseInt(req.query.id);
      let o = await load(id, uid);
      if (!o) return res.status(404).json({ error: 'Bulunamadı.' });
      if (o.status === 'waiting') {
        try {
          const st = await prov.getStatus(o.provider_id);
          if (st.state === 'ok' && st.code) {
            await sql`UPDATE sms_orders SET status = 'received', code = ${String(st.code)} WHERE id = ${id} AND status = 'waiting'`;
            prov.finish(o.provider_id).catch(() => {});
          } else if (st.state === 'cancel') {
            await refund(id, uid, 'waiting', 'expired');
          } else if (o.expires_at && new Date(o.expires_at) < new Date()) { // süre doldu, kod gelmedi
            if (await prov.cancel(o.provider_id)) await refund(id, uid, 'waiting', 'expired');
          }
        } catch (e) { console.error('SMS durum hatası:', e.message); } // geçici hata: bekleme devam eder
        o = await load(id, uid);
      }
      return res.json({ order: pub(o) });
    }
    if (req.method !== 'POST') return res.status(405).end();

    const { action, product, country, id } = req.body || {};

    // ── Numara al ──
    if (action === 'buy') {
      const p = SMS.find(x => x.id === product);
      if (!p) return res.status(400).json({ error: 'Geçersiz servis.' });
      const ctry = COUNTRIES[country];
      if (!ctry || !p.prices[country]) return res.status(400).json({ error: 'Bu servis için seçilen ülke mevcut değil.' });
      const busy = await sql`SELECT 1 FROM sms_orders WHERE user_id = ${uid} AND status IN ('buying','waiting') AND created_at > now() - interval '30 minutes' LIMIT 1`;
      if (busy.length) return res.status(409).json({ error: 'Zaten aktif bir numaranız var.' });
      const price = p.prices[country] * 100; // kuruş
      // Bakiye yeterliyse düş + sipariş aç (tek sorgu, yarış durumu yok)
      const r = await sql`
        WITH u AS (UPDATE users SET balance = balance - ${price}::int WHERE id = ${uid} AND balance >= ${price}::int RETURNING id),
        o AS (INSERT INTO sms_orders (user_id, product, price, status, country) SELECT id, ${p.id}::text, ${price}::int, 'buying', ${country}::text FROM u RETURNING id)
        SELECT id FROM o`;
      if (!r.length) return res.status(402).json({ error: 'Yetersiz bakiye. Lütfen bakiye yükleyiniz.' });
      const oid = r[0].id;
      try {
        const b = await prov.getNumber(p.provider, ctry.provider);
        await sql`UPDATE sms_orders SET status = 'waiting', phone = ${b.phone}, provider_id = ${b.id},
                  expires_at = ${new Date(Date.now() + LIFETIME_MS).toISOString()} WHERE id = ${oid}`;
      } catch (e) {
        console.error('SMS satın alma hatası:', e.code || e.message);
        await refund(oid, uid, 'buying', 'failed');
        const msg = e.code === 'NO_NUMBERS' ? 'Şu an bu ülke için numara yok. Bakiyeniz iade edildi.'
          : 'SMS servisi şu an kullanılamıyor. Bakiyeniz iade edildi.'; // NO_BALANCE / BAD_KEY vb. kullanıcıya gösterilmez
        return res.status(502).json({ error: msg });
      }
      return res.json({ order: pub(await load(oid, uid)) });
    }

    // ── İptal + iade (kod gelmediyse) ──
    if (action === 'cancel') {
      const o = await load(parseInt(id), uid);
      if (!o || o.status !== 'waiting') return res.status(400).json({ error: 'İptal edilemez.' });
      try {
        const st = await prov.getStatus(o.provider_id);
        if (st.state === 'ok' && st.code) {
          await sql`UPDATE sms_orders SET status = 'received', code = ${String(st.code)} WHERE id = ${o.id} AND status = 'waiting'`;
          prov.finish(o.provider_id).catch(() => {});
          return res.status(400).json({ error: 'Kod geldi, iptal edilemez.' });
        }
        if (st.state === 'cancel' || await prov.cancel(o.provider_id)) await refund(o.id, uid, 'waiting', 'cancelled');
      } catch (e) {
        if (e.code === 'EARLY_CANCEL_DENIED') return res.status(400).json({ error: 'Numara ilk 2 dakika içinde iptal edilemez. Biraz sonra tekrar deneyin.' });
        console.error('SMS iptal hatası:', e.code || e.message);
        return res.status(502).json({ error: 'İptal şu an yapılamadı, lütfen tekrar deneyin.' });
      }
      return res.json({ order: pub(await load(o.id, uid)) });
    }
    res.status(400).json({ error: 'Geçersiz istek.' });
  } catch (e) {
    console.error(e);
    sql.fail(res, e);
  }
};
