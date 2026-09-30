# ZeroDijitalMarket

Vercel (statik site + `/api` serverless) + Neon Postgres. Bakiye yükleme: IBAN + dekont.

## Railway / GitHub kurulumu
1. `db/schema.sql` içeriğini PostgreSQL veritabanında bir kez çalıştır.
2. Bu klasörü GitHub deposunun köküne yükle.
3. Railway'de GitHub reposunu içe aktar. Railway `npm start` komutuyla uygulamayı başlatır ve kendi `PORT` değerini kullanır.
4. Railway Variables bölümüne `.env.example` içindeki değişkenleri ekle.
5. Yönetim: `https://SITENIZ/admin.html` (ADMIN_KEY ile) → havale onayı, kullanıcı bakiyesi, havale bilgileri.

Bu paket Replit'e özgü ayar içermez; statik arayüz, API handler'ları ve Railway başlangıç ayarı birlikte gelir.

## Bakiye akışı (IBAN)
1. Kullanıcı tutarı seçer → **İşleme Başla** → 10:00 geri sayım başlar (süre sunucuda tutulur, sayfa yenilense de devam eder).
2. IBAN / alıcı adı / açıklama kodu (`api/_lib/bank.js`) kopyalanabilir gösterilir.
3. Kullanıcı ödemeyi yapıp dekontu yükler. Dekont yüklenmeden **İşlem Tamam** butonu aktif olmaz; süre dolunca da gönderilemez.
4. Admin (`/admin.html`) dekontu görüntüler → **Onayla** ile bakiye eklenir.
- Havale bilgilerini değiştirmek: `/admin.html` → **Havale Bilgileri** sekmesi (İsim Soyisim, IBAN, Açıklama). Kayıt yoksa `api/_lib/bank.js` varsayılanı kullanılır.

## Sonraki sürüm notları
- Servis/fiyat düzenleme: `api/_lib/catalog.js` (fiyatlar kuruş / 1000 adet). SMS fiyatları aynı dosyada.
- SMS Onay: sağlayıcı **onaylasms.com.tr** (SMS-Activate uyumlu API). URL/anahtar `api/_lib/config.js` içindeki `SMS_API_URL` / `SMS_API_KEY` (Vercel env girersen o öncelikli). Ülke ve servis kodları + TL fiyatları `api/_lib/catalog.js` içindeki `COUNTRIES` / `SMS` listesinde. Kod gelmezse kullanıcı iptal eder, bakiye otomatik iade olur. Kontrol: `SITENIZ/api/health` → `sms_api: bağlandı`.
- Tablolar ilk istekte otomatik oluşturulur; sadece `DATABASE_URL` yeterlidir.
- Destek linkleri: `js/config.js` (WHATSAPP, TELEGRAM).
- DB'yi güncellemek için `db/schema.sql` dosyasını tekrar çalıştır (güvenli).
- **Siparişler otomatik**: bakiyesi yeterliyse sipariş anında tedarikçiye (SMM panel API) gönderilir, admin işlemi yoktur. Kurulum: `api/_lib/config.js` içine `PROVIDER_API_URL`, `PROVIDER_API_KEY` ve `SERVICE_IDS` (her servisin tedarikçideki numarası) gir. Tedarikçi bağlı değilse / servis numarası boşsa o serviste sipariş alınmaz ve bakiye çekilmez. Tedarikçi siparişi reddederse bakiye otomatik iade edilir; iptal/kısmi durumlar kullanıcı "Siparişlerim" sayfasını açınca senkronlanır.

## Giriş / Kayıt çalışmıyorsa
1. Tarayıcıda `https://SITENIZ/api/health` adresini aç.
   - Sayfa açılmıyor / 404 → `api` klasörü deploy edilmemiş (Vercel'de Framework: **Other**, Root Directory: zip'in içindeki klasör).
   - `DATABASE_URL: false` → Vercel > Settings > Environment Variables'a ekle, sonra **Redeploy**.
   - `veritabani: HATA` → Neon bağlantı adresini yeniden kopyala (postgres://... tamamı, tırnaksız).
2. Env değişkeni ekledikten sonra mutlaka Redeploy yap.
