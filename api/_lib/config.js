// AYAR DOSYASI
// Hassas değerleri kodda tutmayın; Replit/Vercel ortam değişkenlerini kullanın.
module.exports = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  ADMIN_KEY: process.env.ADMIN_KEY || '',
  // ── SMS Onay (onaylasms.com.tr — SMS-Activate uyumlu API) ──
  SMS_API_URL: 'https://onaylasms.com.tr/stubs/handler_api.php',
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  // ── Sipariş tedarikçisi (standart SMM panel API: action=add/status) ──
  PROVIDER_API_URL: process.env.PROVIDER_API_URL || '',
  PROVIDER_API_KEY: process.env.PROVIDER_API_KEY || '',
  // Bizim servis kodu → tedarikçideki servis numarası (tedarikçi panelindeki ID)
  SERVICE_IDS: {
    'ig-fol-bot': '',
    'ig-fol-yg': '',
    'ig-fol-yng': '',
    'ig-fol-trg': '',
    'ig-fol-trng': '',
    'ig-like-g': '',
    'ig-like-ng': '',
    'ig-view-g': '',
    'ig-view-ng': '',
    'tt-fol-bot': '',
    'tt-fol-yg': '',
    'tt-fol-yng': '',
    'tt-fol-trg': '',
    'tt-fol-trng': '',
    'tt-like-g': '',
    'tt-like-ng': '',
    'tt-view-g': '',
    'tt-view-ng': '',
    'ig-com': ''
  }
};
