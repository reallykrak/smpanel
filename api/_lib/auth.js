const jwt = require('jsonwebtoken');
const NAME = 'zdm_session';
// JWT_SECRET girilmemişse DATABASE_URL'den türetilir (sadece sizde bulunan gizli değer).
const secret = () => process.env.JWT_SECRET || require('./config').JWT_SECRET || 'zdm-gecici-anahtar';

function setCookie(res, uid) {
  const t = jwt.sign({ uid }, secret(), { expiresIn: '30d' });
  res.setHeader('Set-Cookie', `${NAME}=${t}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
}
function clearCookie(res) {
  res.setHeader('Set-Cookie', `${NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
function getUserId(req) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + NAME + '=([^;]+)'));
  if (!m) return null;
  try { return jwt.verify(m[1], secret()).uid; } catch { return null; }
}
module.exports = { setCookie, clearCookie, getUserId };
