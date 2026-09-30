const crypto = require('crypto');
const sql = require('./_lib/db');
const { getUserId } = require('./_lib/auth');
const { getBank } = require('./_lib/settings');

const rand = (n) => crypto.randomBytes(8).toString('hex').toUpperCase().slice(0, n);
const MAX_BYTES = 3 * 1024 * 1024; // Vercel gövde sınırı 4.5MB → base64 sonrası sığsın

// Dosya türünü içeriğinden doğrula (uzantıya/başlığa güvenme)
function sniff(buf) {
  if (buf.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

module.exports = async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Giriş yapmalısınız.' });
    const bank = await getBank();
    const info = { bank: bank.NAME, iban: bank.IBAN, desc: bank.DESC, minutes: bank.MINUTES };

    // Süresi dolmamış aktif işlem varsa döndür (sayfa yenilenince sayaç devam eder)
    if (req.method === 'GET') {
      await sql`UPDATE deposits SET status = 'expired' WHERE user_id = ${uid} AND status = 'awaiting' AND expires_at < now()`;
      const r = await sql`SELECT oid, amount, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - now()))))::int AS left
                          FROM deposits WHERE user_id = ${uid} AND status = 'awaiting' ORDER BY id DESC LIMIT 1`;
      return res.json({ active: r[0] || null, info });
    }
    if (req.method !== 'POST') return res.status(405).end();

    const { action } = req.body || {};

    // ── İŞLEME BAŞLA ───────────────────────────────────────────
    if (action === 'start') {
      const tl = Number(req.body.amount);
      if (!(tl >= 10 && tl <= 10000)) return res.status(400).json({ error: 'Tutar ₺10 ile ₺10.000 arasında olmalıdır.' });
      const kurus = Math.round(tl * 100);
      await sql`UPDATE deposits SET status = 'expired' WHERE user_id = ${uid} AND status = 'awaiting'`;
      const oid = 'ZDM' + rand(6);
      await sql`INSERT INTO deposits (user_id, oid, method, amount, status, expires_at)
                VALUES (${uid}, ${oid}, 'iban', ${kurus}, 'awaiting', now() + make_interval(mins => ${bank.MINUTES}))`;
      return res.json({ active: { oid, amount: kurus, left: bank.MINUTES * 60 }, info });
    }

    // ── İŞLEM TAMAM (dekont gönder) ────────────────────────────
    if (action === 'submit') {
      const { oid, file } = req.body;
      const m = /^data:[\w\/+.-]+;base64,([A-Za-z0-9+\/=]+)$/.exec(String(file || ''));
      if (!m) return res.status(400).json({ error: 'Dekont yüklemelisiniz.' });
      const buf = Buffer.from(m[1], 'base64');
      if (!buf.length || buf.length > MAX_BYTES) return res.status(400).json({ error: 'Dekont en fazla 3 MB olabilir.' });
      const type = sniff(buf);
      if (!type) return res.status(400).json({ error: 'Dekont JPG, PNG, WEBP veya PDF olmalıdır.' });

      // 30 sn tolerans: sayaç 0'a inerken yapılan gönderimi kaçırmamak için
      const r = await sql`UPDATE deposits SET status = 'pending', receipt = ${m[1]}, receipt_type = ${type}
                          WHERE oid = ${String(oid)} AND user_id = ${uid} AND status = 'awaiting'
                            AND expires_at + interval '30 seconds' > now() RETURNING oid`;
      if (!r.length) return res.status(400).json({ error: 'Süre doldu veya işlem bulunamadı. Lütfen yeniden başlatın.' });
      return res.json({ ok: true });
    }

    res.status(400).json({ error: 'Geçersiz istek.' });
  } catch (e) {
    console.error(e);
    sql.fail(res, e);
  }
};
