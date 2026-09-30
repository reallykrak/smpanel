let activeSms = null, smsTimer = null;
const smsName = (id) => (CATALOG.sms.find(s => s.id === id) || {}).name || id;
const smsCountry = (sid, cid) => { const s = CATALOG.sms.find(x => x.id === sid); const c = s && s.countries.find(x => x.id === cid); return c ? `${c.name} (${c.code})` : ''; };
const SMS_STATUS = { buying: ['Hazırlanıyor', 'wait'], waiting: ['Kod Bekleniyor', 'wait'], received: ['Kod Geldi', 'ok'], cancelled: ['İptal / İade', 'bad'], expired: ['Süre Doldu / İade', 'bad'], refunded: ['İade', 'bad'], failed: ['Başarısız / İade', 'bad'] };

// Orijinal marka logoları (assets/brands). [arka plan rengi, renkli logo mu?]
const SMS_BRAND = {
  whatsapp: '#ffffff', telegram: '#2AABEE', facebook: '#1877F2', discord: '#5865F2',
  instagram: 'linear-gradient(45deg,#feda75,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5)',
  google: '#ffffff'
};
const smsLogo = (id) => {
  const bg = SMS_BRAND[id] || '#333';
  const inner = id === 'google'
    ? `<img src="assets/brands/google.svg" alt="">`
    : `<i class="${id === 'whatsapp' ? 'wa-ic' : ''}" style="-webkit-mask:url(assets/brands/${id}.svg) center/contain no-repeat;mask:url(assets/brands/${id}.svg) center/contain no-repeat"></i>`;
  return `<span class="sms-logo" style="background:${bg}">${inner}</span>`;
};
const flag = (cid) => `<img class="flag" src="assets/flags/${esc(cid)}.svg" alt="" loading="lazy">`;

function renderSmsGrid() {
  const list = [...CATALOG.sms].sort((a, b) => (b.id === 'whatsapp') - (a.id === 'whatsapp'));
  document.getElementById('smsGrid').innerHTML = list.map(s => {
    const min = Math.min(...s.countries.map(c => c.price));
    return `<button class="sms-card${s.id === 'whatsapp' ? ' wa' : ''}" onclick="openSmsCountries('${s.id}')">${smsLogo(s.id)}<span>${esc(s.name)}<small>${s.countries.length} ülke · ${tl(min)}'den başlayan</small></span></button>`;
  }).join('');
}
function openSmsCountries(id) {
  const s = CATALOG.sms.find(x => x.id === id); if (!s) return;
  document.getElementById('smsModalHead').innerHTML = `${smsLogo(s.id)}<div><b>${esc(s.name)}</b><small>Ülke seçin, numara hemen alınsın</small></div>`;
  document.getElementById('smsCountries').innerHTML = s.countries.map(c =>
    `<button class="country-row" onclick="pickSmsCountry('${s.id}','${c.id}')">${flag(c.id)}<span class="nm">${esc(c.name)}<small>${esc(c.code)}</small></span><span class="pr">${tl(c.price)}</span></button>`).join('');
  document.querySelector('#smsModal .modal').classList.toggle('wa-theme', s.id === 'whatsapp');
  document.getElementById('smsModal').classList.add('open');
}
function closeSmsModal() { document.getElementById('smsModal').classList.remove('open'); }
document.getElementById('smsModal').addEventListener('click', function (e) { if (e.target === this) closeSmsModal(); });
function pickSmsCountry(sid, cid) {
  closeSmsModal();
  if (!currentUser) { openModal('auth'); switchTab('login'); showToast('Numara almak için giriş yapınız.', 'error'); return; }
  buySms(sid, cid);
}
async function buySms(id, country) {
  if (activeSms && activeSms.status === 'waiting') { showToast('Zaten aktif bir numaranız var.', 'error'); return; }
  try {
    const d = await api('/api/sms', { method: 'POST', body: { action: 'buy', product: id, country } });
    activeSms = d.order; renderActiveSms(); startSmsPoll(); refreshUser();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Numara alındı. Destek bölümünden de takip edebilirsiniz.');
  } catch (e) {
    showToast(e.message, 'error');
    if (/bakiye yetersiz|Yetersiz/i.test(e.message)) location.hash = '#/bakiye';
  }
}
function smsRows(o, pre) {
  const code = o.code
    ? `<span class="val code" id="${pre}Code">${esc(o.code)}</span><button class="btn btn-outline btn-sm" onclick="copyText('${pre}Code')">${ic('copy')}Kopyala</button>`
    : (o.status === 'waiting' ? `<span><span class="spinner"></span> Kod bekleniyor...</span>` : '<span class="hint">-</span>');
  return { code };
}
function renderActiveSms() {
  renderSupportSms();
  const box = document.getElementById('smsActive'), o = activeSms;
  if (!o) { box.style.display = 'none'; return; }
  const [label, cls] = SMS_STATUS[o.status] || [o.status, ''];
  box.style.display = 'block';
  box.classList.toggle('wa-theme', o.product === 'whatsapp');
  box.innerHTML = `
    <div class="row"><span class="lbl" style="margin:0">Servis</span><b>${esc(smsName(o.product))}${o.country ? ' · ' + flag(o.country) + ' ' + esc(smsCountry(o.product, o.country)) : ''}</b><span class="badge ${cls}">${label}</span></div>
    <div class="row"><span class="lbl" style="margin:0">Numara</span><span class="val" id="smsPhone">${esc(o.phone || '-')}</span>
      ${o.phone ? `<button class="btn btn-outline btn-sm" onclick="copyText('smsPhone')">${ic('copy')}Kopyala</button>` : ''}</div>
    <div class="row"><span class="lbl" style="margin:0">SMS Kodu</span>${smsRows(o, 'sms').code}</div>
    ${o.status === 'waiting' ? `<button class="btn btn-outline btn-block" style="margin-top:12px" onclick="cancelSms()">İptal Et ve İade Al</button>` : ''}`;
}
// Destek penceresi + Destek menüsündeki nokta: numara → "Kod bekleniyor" → kod
function renderSupportSms() {
  const box = document.getElementById('supportSms'), o = activeSms;
  document.querySelectorAll('.sup-link').forEach(a => { a.classList.toggle('live', !!o); a.classList.toggle('done', !!o && o.status === 'received'); });
  if (!box) return;
  if (!o) { box.innerHTML = ''; return; }
  const [label, cls] = SMS_STATUS[o.status] || [o.status, ''];
  const wait = o.status === 'waiting' || o.status === 'buying';
  box.innerHTML = `<div class="sup-sms${o.product === 'whatsapp' ? ' wa-theme' : ''}" style="display:block">
    <div class="sup-h"><b>${esc(smsName(o.product))}${o.country ? ' · ' + flag(o.country) : ''}</b><span class="badge ${cls}">${label}</span></div>
    <div class="sup-row"><small>Numara</small><span class="sup-val" id="supPhone">${esc(o.phone || 'Numara alınıyor...')}</span>
      ${o.phone ? `<button class="btn btn-outline btn-sm" onclick="copyText('supPhone')">${ic('copy')}</button>` : ''}</div>
    <div class="sup-row"><small>SMS Kodu</small>
      ${o.code ? `<span class="sup-val code" id="supCode">${esc(o.code)}</span><button class="btn btn-outline btn-sm" onclick="copyText('supCode')">${ic('copy')}</button>`
               : (wait ? `<span class="sup-val sup-wait"><span class="spinner"></span> Kod bekleniyor...</span>` : '<span class="sup-val hint">-</span>')}</div>
    ${o.status === 'waiting' ? `<button class="btn btn-outline btn-block btn-sm sup-cancel" onclick="cancelSms()">İptal Et ve İade Al</button>` : ''}
  </div>`;
}
function startSmsPoll() { stopSmsPoll(); smsTimer = setInterval(pollSms, 5000); }
function stopSmsPoll() { if (smsTimer) clearInterval(smsTimer); smsTimer = null; }
async function pollSms() {
  if (!activeSms) return stopSmsPoll();
  try {
    const d = await api('/api/sms?id=' + activeSms.id);
    const changed = d.order.status !== activeSms.status;
    activeSms = d.order; renderActiveSms();
    if (activeSms.status !== 'waiting') { stopSmsPoll(); if (changed) refreshUser(); if (activeSms.status === 'received') showToast('SMS kodu geldi.'); }
    if (changed && location.hash === '#/gecmis') loadHistory();
  } catch {}
}
async function cancelSms() {
  try {
    const d = await api('/api/sms', { method: 'POST', body: { action: 'cancel', id: activeSms.id } });
    activeSms = d.order; renderActiveSms(); stopSmsPoll(); refreshUser(); showToast('İptal edildi, bakiyeniz iade edildi.');
  } catch (e) { showToast(e.message, 'error'); }
}
async function resumeSms() {
  if (!currentUser || activeSms) return;
  try {
    const h = await api('/api/history'), now = new Date();
    // Bekleyen numara, ya da son 30 dk içinde kodu gelen numara
    const o = h.sms.find(x => x.status === 'waiting' && (!x.expires_at || new Date(x.expires_at) > now))
      || h.sms.find(x => x.status === 'received' && now - new Date(x.created_at) < 30 * 60000);
    if (o) { activeSms = o; renderActiveSms(); if (o.status === 'waiting') { startSmsPoll(); pollSms(); } }
  } catch {}
}
function copyText(id) {
  const t = document.getElementById(id).textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => showToast('Kopyalandı')).catch(() => showToast('Kopyalanamadı', 'error'));
}
