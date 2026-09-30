async function api(path, { method = 'GET', body } = {}) {
  let r;
  try { r = await fetch(path, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  }); } catch { throw new Error('Sunucuya ulaşılamadı. İnternetinizi kontrol edin; siteyi dosyadan açıyorsanız Vercel adresinden açın.'); }
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(data.error || (r.status === 404 ? 'API bulunamadı (404). Site Vercel üzerinde çalışmıyor ya da /api klasörü yüklenmemiş. Tarayıcıda SITENIZ/api/health adresini açıp kontrol edin.' : `Sunucu hatası (${r.status}). SITENIZ/api/health adresini açıp neyin eksik olduğuna bakın.`));
  return data;
}
const tl = (k) => '₺' + (k / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
