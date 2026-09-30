// ─────────────────────────────────────────────────────────────
// SERVİS KATALOĞU — fiyatları burada düzenle. Fiyatlar KURUŞ / 1000 adet.
// (Örnek fiyatlardır; tedarikçi maliyetine göre kendin belirle.)
// ─────────────────────────────────────────────────────────────
const S = (id, platform, category, name, price, min, max, desc = '') => ({ id, platform, category, name, price, min, max, desc });

const SERVICES = [
  S('ig-fol-bot', 'instagram', 'Takipçi', 'Bot Takipçi Garantisiz (Yabancı)', 600, 100, 50000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Bot hesaplardan gelir, garantisizdir.'),
  S('ig-fol-yg', 'instagram', 'Takipçi', 'Garantili Takipçi (Yabancı)', 2500, 100, 20000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Düşüşlere karşı telafi garantilidir.'),
  S('ig-fol-yng', 'instagram', 'Takipçi', 'Garantisiz Takipçi (Yabancı)', 1200, 100, 20000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('ig-fol-trg', 'instagram', 'Takipçi', 'Türk Takipçi (Garantili)', 7500, 100, 10000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Düşüşlere karşı telafi garantilidir.'),
  S('ig-fol-trng', 'instagram', 'Takipçi', 'Türk Takipçi (Garantisiz)', 4500, 100, 10000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('ig-like-g', 'instagram', 'Beğeni', 'Beğeni (Garantili)', 250, 50, 20000, 'Gönderi linki giriniz. Düşüşlere karşı telafi garantilidir.'),
  S('ig-like-ng', 'instagram', 'Beğeni', 'Beğeni (Garantisiz)', 120, 50, 20000, 'Gönderi linki giriniz. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('ig-view-g', 'instagram', 'İzlenme', 'İzlenme (Garantili)', 100, 100, 1000000, 'Video veya Reels linki giriniz. Düşüşlere karşı telafi garantilidir.'),
  S('ig-view-ng', 'instagram', 'İzlenme', 'İzlenme (Garantisiz)', 50, 100, 1000000, 'Video veya Reels linki giriniz. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('tt-fol-bot', 'tiktok', 'Takipçi', 'Bot Takipçi Garantisiz (Yabancı)', 900, 100, 50000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Bot hesaplardan gelir, garantisizdir.'),
  S('tt-fol-yg', 'tiktok', 'Takipçi', 'Garantili Takipçi (Yabancı)', 3500, 100, 20000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Düşüşlere karşı telafi garantilidir.'),
  S('tt-fol-yng', 'tiktok', 'Takipçi', 'Garantisiz Takipçi (Yabancı)', 1800, 100, 20000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('tt-fol-trg', 'tiktok', 'Takipçi', 'Türk Takipçi (Garantili)', 9000, 100, 10000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Düşüşlere karşı telafi garantilidir.'),
  S('tt-fol-trng', 'tiktok', 'Takipçi', 'Türk Takipçi (Garantisiz)', 6000, 100, 10000, 'Profil linki giriniz. Hesap herkese açık olmalıdır. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('tt-like-g', 'tiktok', 'Beğeni', 'Beğeni (Garantili)', 2200, 50, 20000, 'Video linki giriniz. Düşüşlere karşı telafi garantilidir.'),
  S('tt-like-ng', 'tiktok', 'Beğeni', 'Beğeni (Garantisiz)', 1500, 50, 20000, 'Video linki giriniz. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('tt-view-g', 'tiktok', 'İzlenme', 'İzlenme (Garantili)', 80, 100, 1000000, 'Video linki giriniz. Düşüşlere karşı telafi garantilidir.'),
  S('tt-view-ng', 'tiktok', 'İzlenme', 'İzlenme (Garantisiz)', 40, 100, 1000000, 'Video linki giriniz. Garantisizdir; düşüş olursa telafi yapılmaz.'),
  S('ig-com', 'instagram', 'Yorum', 'Instagram Türk Yorum (Rastgele)', 15000, 5, 500, 'Gönderi linki giriniz.')
];

// SMS Onay — ülkeler ve fiyatlar (TL). provider = SMS-Activate ülke numarası (onaylasms.com.tr).
// Sağlayıcıda numara çıkmayan ülke/servis olursa burada kod/fiyat düzenle ya da satırı sil.
const COUNTRIES = {
  tr: { name: 'Türkiye', code: '+90', provider: 62 },
  us: { name: 'ABD', code: '+1', provider: 12 },
  gb: { name: 'İngiltere', code: '+44', provider: 16 },
  ca: { name: 'Kanada', code: '+1', provider: 36 },
  de: { name: 'Almanya', code: '+49', provider: 43 },
  id: { name: 'Endonezya', code: '+62', provider: 6 },
  il: { name: 'İsrail', code: '+972', provider: 13 },
  ma: { name: 'Fas', code: '+212', provider: 37 }
};
// prices: ülke → TL fiyatı. Listede olmayan ülke o serviste satılmaz. provider = SMS-Activate servis kodu.
const SMS = [
  { id: 'whatsapp', name: 'WhatsApp', provider: 'wa', prices: { tr: 250, us: 200, gb: 150, ca: 150, de: 200, id: 100, il: 200, ma: 150 } },
  { id: 'telegram', name: 'Telegram', provider: 'tg', prices: { tr: 250, us: 150, gb: 150, ca: 150, de: 150, id: 100, il: 200, ma: 150 } },
  { id: 'instagram', name: 'Instagram', provider: 'ig', prices: { tr: 150, us: 100, gb: 100, ca: 100, id: 100, de: 100, il: 100 } },
  { id: 'facebook', name: 'Facebook', provider: 'fb', prices: { tr: 150, us: 100, gb: 100, ca: 100, id: 100, de: 100, il: 100 } },
  { id: 'google', name: 'Google / Gmail', provider: 'go', prices: { tr: 150, us: 100, gb: 100, ca: 100, id: 100, de: 100, il: 100 } },
  { id: 'discord', name: 'Discord', provider: 'ds', prices: { tr: 190, us: 120, gb: 120, il: 190, ca: 120, de: 190 } }
];

const HOSTS = {
  instagram: ['instagram.com'], tiktok: ['tiktok.com']
};

module.exports = { SERVICES, SMS, COUNTRIES, HOSTS };
