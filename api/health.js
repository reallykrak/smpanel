// Tanı sayfası: https://SITENIZ/api/health  → neyin eksik olduğunu gösterir (gizli değer göstermez)
const sql = require('./_lib/db');
module.exports = async (req, res) => {
  const out = {
    api: 'çalışıyor',
    DATABASE_URL: !!(process.env.DATABASE_URL || require('./_lib/config').DATABASE_URL),
    JWT_SECRET: !!process.env.JWT_SECRET,
    ADMIN_KEY: !!process.env.ADMIN_KEY,
    SMS_API_KEY: false,
    sms_api: 'denenmedi',
    veritabani: 'denenmedi'
  };
  const smsapi = require('./_lib/smsapi');
  out.SMS_API_KEY = smsapi.ready();
  if (out.SMS_API_KEY) {
    try { await smsapi.balance(); out.sms_api = 'bağlandı'; }
    catch (e) { out.sms_api = 'HATA: ' + (e.code || e.message); } // BAD_KEY = anahtar yanlış
  }
  try {
    const r = await sql`SELECT count(*)::int AS n FROM users`;
    out.veritabani = 'bağlandı';
    out.kayitli_kullanici = r[0].n;
  } catch (e) {
    out.veritabani = 'HATA';
    out.hata_kodu = e.code || null;
    out.hata = String(e.message || e).slice(0, 200);
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(out);
};
