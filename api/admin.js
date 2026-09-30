const crypto = require('crypto');
const sql = require('./_lib/db');
const credit = require('./_lib/credit');
const { getBank, saveBank } = require('./_lib/settings');
const ADMIN_KEY = process.env.ADMIN_KEY || require('./_lib/config').ADMIN_KEY;

function okKey(k) {
  const a = Buffer.from(String(k || '')), b = Buffer.from(String(ADMIN_KEY || ''));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!okKey(req.headers['x-admin-key'])) return res.status(401).json({ error: 'Yetkisiz' });
    const q = req.query || {};

    if (req.method === 'GET' && q.receipt) {
      const r = await sql`SELECT receipt, receipt_type FROM deposits WHERE oid = ${String(q.receipt)}`;
      if (!r.length || !r[0].receipt) return res.status(404).json({ error: 'Dekont yok.' });
      return res.json({ type: r[0].receipt_type, data: r[0].receipt });
    }

    // Hafif sayaç (bildirim rozetleri için sık sorgulanır)
    if (req.method === 'GET' && q.counts) {
      const d = await sql`SELECT count(*)::int AS n FROM deposits WHERE method = 'iban' AND status = 'pending' AND receipt IS NOT NULL`;
      return res.json({ deposits: d[0].n });
    }

    // Havale bilgileri (isim soyisim / IBAN / açıklama)
    if (req.method === 'GET' && q.bank) {
      const b = await getBank();
      return res.json({ name: b.NAME, iban: b.IBAN, desc: b.DESC });
    }

    // Tüm kayıtlı kullanıcılar
    if (req.method === 'GET' && q.users) {
      const users = await sql`SELECT id, name, email, balance, created_at FROM users ORDER BY id DESC LIMIT 1000`;
      return res.json({ users });
    }

    if (req.method === 'GET') {
      const deposits = await sql`SELECT d.oid, d.amount, d.created_at, u.email, u.name FROM deposits d JOIN users u ON u.id = d.user_id
                                 WHERE d.method = 'iban' AND d.status = 'pending' AND d.receipt IS NOT NULL ORDER BY d.id DESC LIMIT 100`;
      return res.json({ deposits });
    }
    if (req.method !== 'POST') return res.status(405).end();

    const { type, oid, id, action } = req.body || {};

    if (type === 'deposit') {
      if (action === 'approve') return res.json({ ok: await credit(sql, String(oid)) });
      if (action === 'reject') { await sql`UPDATE deposits SET status = 'rejected' WHERE oid = ${String(oid)} AND status = 'pending'`; return res.json({ ok: true }); }
    }

    // Kullanıcıya elle bakiye ekle / düş (amount: TL, eksi = düş)
    if (type === 'user' && action === 'balance') {
      const tl = Number(req.body.amount);
      const kurus = Math.round(tl * 100);
      const uid = Number(id);
      if (!Number.isInteger(uid) || !Number.isFinite(tl) || kurus === 0 || Math.abs(kurus) > 100000000)
        return res.status(400).json({ error: 'Geçersiz tutar.' });
      const r = await sql`UPDATE users SET balance = balance + ${kurus} WHERE id = ${uid} AND balance + ${kurus} >= 0 RETURNING id, balance`;
      if (!r.length) return res.status(400).json({ error: 'Kullanıcı bulunamadı ya da bakiye eksiye düşer.' });
      return res.json({ ok: true, balance: r[0].balance });
    }

    // Havale bilgilerini güncelle
    if (type === 'bank' && action === 'save') {
      const NAME = String(req.body.name || '').trim().replace(/\s+/g, ' ');
      const DESC = String(req.body.desc || '').trim();
      const raw = String(req.body.iban || '').replace(/\s+/g, '').toUpperCase();
      if (NAME.length < 3 || NAME.length > 100) return res.status(400).json({ error: 'İsim soyisim 3-100 karakter olmalı.' });
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(raw)) return res.status(400).json({ error: 'IBAN geçersiz görünüyor (örn: TR12 0006 ...).' });
      if (DESC.length < 1 || DESC.length > 60) return res.status(400).json({ error: 'Açıklama 1-60 karakter olmalı.' });
      const IBAN = raw.replace(/(.{4})/g, '$1 ').trim();
      await saveBank({ NAME, IBAN, DESC });
      return res.json({ ok: true, name: NAME, iban: IBAN, desc: DESC });
    }

    res.status(400).json({ error: 'Geçersiz istek.' });
  } catch (e) {
    console.error(e);
    sql.fail(res, e);
  }
};
