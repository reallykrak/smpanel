// Bakiye yükleme: tutar seç → İşleme Başla → 10:00 sayaç + IBAN → dekont yükle → İşlem Tamam
let topupAmount = 0, payInfo = null, payActive = null, payTimer = null, payLeft = 0, payFile = null;

let payPoll = null;
function stopPayTimers() {
  if (payTimer) { clearInterval(payTimer); payTimer = null; }
  if (payPoll) { clearInterval(payPoll); payPoll = null; }
}
// Dekont gönderildikten sonra admin onayını bekle; bakiye artınca haber ver
function watchApproval() {
  const before = currentUser ? currentUser.balance : 0;
  if (payPoll) clearInterval(payPoll);
  payPoll = setInterval(async () => {
    await refreshUser();
    if (currentUser && currentUser.balance > before) {
      clearInterval(payPoll); payPoll = null;
      showToast('✅ Ödemeniz onaylandı, bakiyeniz yüklendi!');
      const st = document.getElementById('payStage');
      if (st) st.innerHTML = '<div style="text-align:center;padding:20px 0"><h3>Bakiyeniz yüklendi ✅</h3></div><button class="btn btn-gold btn-block" onclick="initTopup()">Yeni Yükleme</button>';
    }
  }, 8000);
}

function selectAmount(v, el) {
  topupAmount = v;
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
  const c = document.getElementById('customAmount'); if (c) c.value = '';
}
function setCustomAmount(v) {
  topupAmount = Number(String(v).replace(',', '.')) || 0;
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
}

// Sayfa açılınca: süresi dolmamış işlem varsa kaldığı yerden devam et
async function initTopup() {
  stopPayTimers();
  showPayForm();
  try {
    const d = await api('/api/deposit');
    payInfo = d.info;
    if (d.active) { payActive = d.active; payLeft = d.active.left; payFile = null; renderPayStage(); }
  } catch (e) { showToast(e.message, 'error'); }
}

function showPayForm() {
  document.getElementById('payForm').style.display = '';
  const st = document.getElementById('payStage'); st.style.display = 'none'; st.innerHTML = '';
}

async function handleTopup() {
  if (!currentUser) { openModal('auth'); switchTab('login'); return; }
  if (!(topupAmount >= 10 && topupAmount <= 10000)) return showToast('Tutar ₺10 ile ₺10.000 arasında olmalıdır.', 'error');
  try {
    const d = await api('/api/deposit', { method: 'POST', body: { action: 'start', amount: topupAmount } });
    payInfo = d.info; payActive = d.active; payLeft = d.active.left; payFile = null;
    renderPayStage();
  } catch (e) { showToast(e.message, 'error'); }
}

function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

function copyText(t) {
  const done = () => showToast('Kopyalandı');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, done);
  else { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch {} a.remove(); done(); }
}

function renderPayStage() {
  stopPayTimers();
  document.getElementById('payForm').style.display = 'none';
  const st = document.getElementById('payStage'); st.style.display = 'block';
  const i = payInfo || {};
  const row = (l, v, cls) => `<div><span>${l}</span><b class="${cls || ''}">${esc(v)}</b> <button class="btn btn-outline btn-sm" data-copy="${esc(v)}">Kopyala</button></div>`;
  st.innerHTML = `
    <div class="timer-wrap"><small>Kalan süre</small><div class="timer" id="payTimer">${fmtTime(payLeft)}</div></div>
    <div class="iban-box">
      ${row('Banka / Alıcı', i.bank || '')}
      ${row('IBAN', i.iban || '')}
      ${row('Tutar', (payActive.amount / 100).toFixed(2).replace('.', ',') + ' TL')}
      ${row('Açıklama kodu', i.desc || '', 'code')}
    </div>
    <p class="iban-note">Yukarıdaki IBAN'a <b>${tl(payActive.amount)}</b> gönderin, <b>açıklama kısmına kodu</b> yazın. Ardından dekontu yükleyip <b>İşlem Tamam</b>'a basın.</p>
    <div class="field" style="margin-top:14px"><label class="lbl">Dekont (JPG, PNG, WEBP veya PDF – en fazla 3 MB)</label>
      <input class="input" id="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></div>
    <button class="btn btn-gold btn-block" id="payDone" disabled>İşlem Tamam</button>
    <div style="text-align:center;margin-top:12px"><span class="back-link" id="payCancel">Vazgeç</span></div>`;

  st.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText(b.dataset.copy));
  document.getElementById('receiptFile').onchange = (e) => {
    const f = e.target.files[0]; payFile = null;
    if (f && f.size > 3 * 1024 * 1024) { e.target.value = ''; showToast('Dekont en fazla 3 MB olabilir.', 'error'); }
    else payFile = f || null;
    updatePayBtn();
  };
  document.getElementById('payDone').onclick = submitReceipt;
  document.getElementById('payCancel').onclick = () => { stopPayTimers(); payActive = null; showPayForm(); };

  payTimer = setInterval(() => {
    payLeft--;
    const t = document.getElementById('payTimer');
    if (t) { t.textContent = fmtTime(Math.max(0, payLeft)); t.classList.toggle('low', payLeft <= 60); }
    if (payLeft <= 0) { stopPayTimers(); payActive = null; showToast('Süre doldu. Lütfen işlemi yeniden başlatın.', 'error'); showPayForm(); return; }
    updatePayBtn();
  }, 1000);
}

function updatePayBtn() {
  const b = document.getElementById('payDone'); if (b) b.disabled = !(payFile && payLeft > 0);
}

async function submitReceipt() {
  if (!payFile || !payActive) return;
  const b = document.getElementById('payDone'); b.disabled = true; b.textContent = 'Gönderiliyor...';
  try {
    const file = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Dosya okunamadı.')); r.readAsDataURL(payFile); });
    await api('/api/deposit', { method: 'POST', body: { action: 'submit', oid: payActive.oid, file } });
    stopPayTimers(); payActive = null; payFile = null;
    const st = document.getElementById('payStage');
    st.innerHTML = `<div style="text-align:center;padding:20px 0"><h3>Dekontunuz alındı ✅</h3><p class="hint">Ödemeniz kontrol edildikten sonra bakiyeniz yüklenecek. Durumu "Siparişlerim → Bakiye Hareketleri"nden görebilirsiniz.</p></div>
      <a class="btn btn-gold btn-block" href="#/gecmis">Bakiye Hareketleri</a>`;
    showToast('Dekont gönderildi.'); watchApproval();
  } catch (e) { showToast(e.message, 'error'); b.textContent = 'İşlem Tamam'; updatePayBtn(); }
}
