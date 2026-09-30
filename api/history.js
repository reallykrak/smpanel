const sql = require('./_lib/db');
const { getUserId } = require('./_lib/auth');
const provider = require('./_lib/provider');

// İşlemdeki siparişlerin durumunu tedarikçiden çek; bitenleri tamamla, iptalleri iade et
async function syncOrders(uid) {
  try {
    const open = await sql`SELECT id, provider_order, quantity, cost FROM orders WHERE user_id = ${uid} AND status = 'processing' AND provider_order IS NOT NULL LIMIT 50`;
    if (!open.length) return;
    const st = await provider.statuses(open.map(o => o.provider_order));
    for (const o of open) {
      const x = st[o.provider_order]; if (!x || x.error) continue;
      const s = String(x.status || '').toLowerCase();
      if (s === 'completed') await sql`UPDATE orders SET status = 'completed' WHERE id = ${o.id} AND status = 'processing'`;
      else if (s === 'canceled' || s === 'cancelled' || s === 'refunded')
        await sql`WITH o AS (UPDATE orders SET status = 'cancelled' WHERE id = ${o.id} AND status = 'processing' RETURNING user_id, cost)
                  UPDATE users SET balance = users.balance + o.cost FROM o WHERE users.id = o.user_id`;
      else if (s === 'partial') { // gitmeyen kısım kadar iade
        const back = Math.min(o.cost, Math.floor(o.cost * (Math.max(0, parseInt(x.remains) || 0)) / o.quantity));
        await sql`WITH o AS (UPDATE orders SET status = 'completed' WHERE id = ${o.id} AND status = 'processing' RETURNING user_id)
                  UPDATE users SET balance = users.balance + ${back}::int FROM o WHERE users.id = o.user_id`;
      }
    }
  } catch (e) { console.error('sync', e); }
}
module.exports = async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Giriş yapmalısınız.' });
    await syncOrders(uid);
    const [orders, sms, deposits] = await Promise.all([
      sql`SELECT id, service_name, link, quantity, cost, status, created_at FROM orders WHERE user_id = ${uid} ORDER BY id DESC LIMIT 50`,
      sql`SELECT id, product, country, price, status, phone, code, expires_at, created_at FROM sms_orders WHERE user_id = ${uid} ORDER BY id DESC LIMIT 50`,
      sql`SELECT oid, method, amount, status, created_at FROM deposits WHERE user_id = ${uid} ORDER BY id DESC LIMIT 50`
    ]);
    res.json({ orders, sms, deposits });
  } catch (e) { console.error(e); sql.fail(res, e); }
};
