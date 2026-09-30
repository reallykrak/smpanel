const sql = require('./_lib/db');
const { getUserId } = require('./_lib/auth');
const { SERVICES, HOSTS } = require('./_lib/catalog');
const provider = require('./_lib/provider');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Giriş yapmalısınız.' });

    const { service, link, quantity } = req.body || {};
    const svc = SERVICES.find(s => s.id === service);
    if (!svc) return res.status(400).json({ error: 'Geçersiz servis.' });

    let host = '';
    try { const u = new URL(String(link)); if (u.protocol === 'https:') host = u.hostname.replace(/^www\./, '').replace(/^m\./, ''); } catch {}
    if (!HOSTS[svc.platform].some(h => host === h || host.endsWith('.' + h)))
      return res.status(400).json({ error: 'Geçerli bir ' + svc.platform + ' linki giriniz (https://...).' });

    const q = parseInt(quantity);
    if (!(q >= svc.min && q <= svc.max)) return res.status(400).json({ error: `Miktar ${svc.min} ile ${svc.max} arasında olmalıdır.` });

    // Tedarikçi bağlı değilse bakiye çekilmez (sipariş sahipsiz kalmasın)
    if (!provider.ready(svc.id)) return res.status(503).json({ error: 'Bu servis şu anda sipariş almıyor. Lütfen daha sonra tekrar deneyin.' });

    const cost = Math.max(1, Math.ceil((q * svc.price) / 1000));
    const r = await sql`
      WITH u AS (
        UPDATE users SET balance = balance - ${cost}::int
        WHERE id = ${uid} AND balance >= ${cost}::int
        RETURNING id, balance
      ), o AS (
        INSERT INTO orders (user_id, service_id, service_name, link, quantity, cost, status)
        SELECT id, ${svc.id}::text, ${svc.name}::text, ${String(link)}::text, ${q}::int, ${cost}::int, 'processing' FROM u
        RETURNING id
      )
      SELECT u.balance, o.id FROM u, o`;
    if (!r.length) return res.status(402).json({ error: 'Yetersiz bakiye. Lütfen bakiye yükleyiniz.' });
    const orderId = r[0].id;

    // Otomatik gönderim: tedarikçiye ilet; olmazsa anında iade
    try {
      const po = await provider.add(svc.id, String(link), q);
      await sql`UPDATE orders SET provider_order = ${po} WHERE id = ${orderId}`;
    } catch (e) {
      console.error('provider add', e);
      await sql`WITH o AS (UPDATE orders SET status = 'failed' WHERE id = ${orderId} AND status = 'processing' RETURNING user_id, cost)
                UPDATE users SET balance = users.balance + o.cost FROM o WHERE users.id = o.user_id`;
      return res.status(502).json({ error: 'Sipariş iletilemedi, bakiyeniz iade edildi. Lütfen tekrar deneyin.' });
    }
    res.json({ orderId, balance: r[0].balance });
  } catch (e) {
    console.error(e);
    sql.fail(res, e);
  }
};
