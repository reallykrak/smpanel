let HIST = { orders: [], sms: [], deposits: [] }, histTab = 'orders';
const ST = { pending: ['Bekliyor', 'wait'], processing: ['İşleniyor', 'wait'], completed: ['Tamamlandı', 'ok'], cancelled: ['İptal / İade', 'bad'], paid: ['Onaylandı', 'ok'], failed: ['Başarısız', 'bad'], rejected: ['Reddedildi', 'bad'], awaiting: ['Dekont Bekleniyor', 'wait'], expired: ['Süre Doldu', 'bad'] };
const badge = (s) => { const [l, c] = ST[s] || SMS_STATUS[s] || [s, '']; return `<span class="badge ${c}">${l}</span>`; };
const dt = (d) => new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

async function loadHistory() {
  try { HIST = await api('/api/history'); } catch (e) { showToast(e.message, 'error'); }
  showHist(histTab);
}
function showHist(t) {
  histTab = t;
  document.querySelectorAll('#histTabs .tab').forEach(x => x.classList.toggle('active', x.dataset.h === t));
  const head = document.getElementById('histHead'), body = document.getElementById('histBody'), rows = HIST[t] || [];
  const empty = (n) => `<tr><td colspan="${n}" class="empty">Kayıt bulunamadı.</td></tr>`;
  if (t === 'orders') {
    head.innerHTML = '<tr><th>No</th><th>Tarih</th><th>Servis</th><th>Link</th><th>Miktar</th><th>Tutar</th><th>Durum</th></tr>';
    body.innerHTML = rows.map(o => `<tr><td>${o.id}</td><td>${dt(o.created_at)}</td><td>${esc(o.service_name || '-')}</td><td class="link">${esc(o.link)}</td><td>${o.quantity}</td><td class="gold">${tl(o.cost)}</td><td>${badge(o.status)}</td></tr>`).join('') || empty(7);
  } else if (t === 'sms') {
    head.innerHTML = '<tr><th>No</th><th>Tarih</th><th>Servis</th><th>Numara</th><th>Kod</th><th>Tutar</th><th>Durum</th></tr>';
    body.innerHTML = rows.map(o => `<tr><td>${o.id}</td><td>${dt(o.created_at)}</td><td>${esc(smsName(o.product))}${o.country ? '<br><small class="hint">' + esc(smsCountry(o.product, o.country)) + '</small>' : ''}</td><td>${esc(o.phone || '-')}</td><td class="gold">${esc(o.code || '-')}</td><td>${tl(o.price)}</td><td>${badge(o.status)}</td></tr>`).join('') || empty(7);
  } else {
    head.innerHTML = '<tr><th>Kod</th><th>Tarih</th><th>Yöntem</th><th>Tutar</th><th>Durum</th></tr>';
    body.innerHTML = rows.map(o => `<tr><td>${esc(o.oid)}</td><td>${dt(o.created_at)}</td><td>${'Havale / EFT'}</td><td class="gold">${tl(o.amount)}</td><td>${badge(o.status)}</td></tr>`).join('') || empty(5);
  }
}
