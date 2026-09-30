const sql = require('./_lib/db');
const bcrypt = require('bcryptjs');
const { setCookie, clearCookie, getUserId } = require('./_lib/auth');
const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const id = getUserId(req);
      if (!id) return res.json({ user: null });
      const r = await sql`SELECT name, email, balance FROM users WHERE id = ${id}`;
      return res.json({ user: r[0] || null });
    }
    if (req.method !== 'POST') return res.status(405).end();

    const { action, name, email, password } = req.body || {};
    if (action === 'logout') { clearCookie(res); return res.json({ ok: true }); }

    const mail = String(email || '').trim().toLowerCase();
    if (!RE.test(mail) || typeof password !== 'string') return res.status(400).json({ error: 'Geçersiz bilgiler.' });

    if (action === 'register') {
      const nm = String(name || '').trim();
      if (nm.length < 2 || nm.length > 80) return res.status(400).json({ error: 'Ad Soyad geçersiz.' });
      if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Şifre 8-72 karakter olmalıdır.' });
      const hash = await bcrypt.hash(password, 10);
      const r = await sql`INSERT INTO users (name, email, password_hash) VALUES (${nm}, ${mail}, ${hash})
                          ON CONFLICT (email) DO NOTHING RETURNING id, name, email, balance`;
      if (!r.length) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
      setCookie(res, r[0].id);
      const { id, ...user } = r[0];
      return res.json({ user });
    }

    if (action === 'login') {
      const r = await sql`SELECT id, name, email, balance, password_hash FROM users WHERE email = ${mail}`;
      if (!r.length || !(await bcrypt.compare(password, r[0].password_hash)))
        return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
      setCookie(res, r[0].id);
      return res.json({ user: { name: r[0].name, email: r[0].email, balance: r[0].balance } });
    }
    res.status(400).json({ error: 'Geçersiz istek.' });
  } catch (e) {
    console.error(e);
    sql.fail(res, e);
  }
};
