const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: 'instagram-c' },
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok-c' }
];
let CATALOG = { services: [], sms: [] };
let orderPlatform = 'instagram';
let tablePlatform = 'instagram';

async function loadCatalog() {
  try { CATALOG = await api('/api/catalog'); } catch { showToast('Servis listesi yüklenemedi.', 'error'); }
  renderOrderTabs(); fillCategories(); renderSvcTabs(); renderSvcTable(); renderSmsGrid();
}
const tabsHtml = (active, fn) => PLATFORMS.map(p => `<div class="tab ${p.id === active ? 'active' : ''}" onclick="${fn}('${p.id}')">${ic(p.icon)}${p.name}</div>`).join('');

function renderOrderTabs() { document.getElementById('orderTabs').innerHTML = tabsHtml(orderPlatform, 'setOrderPlatform'); }
function setOrderPlatform(p) { orderPlatform = p; renderOrderTabs(); fillCategories(); }
function goPlatform(p) { orderPlatform = p; renderOrderTabs(); fillCategories(); location.hash = '#/siparis'; }

function fillCategories() {
  const cats = [...new Set(CATALOG.services.filter(s => s.platform === orderPlatform).map(s => s.category))];
  document.getElementById('catSelect').innerHTML = cats.map(c => `<option>${esc(c)}</option>`).join('');
  fillServices();
}
function onCatChange() { fillServices(); }
function fillServices() {
  const cat = document.getElementById('catSelect').value;
  const list = CATALOG.services.filter(s => s.platform === orderPlatform && s.category === cat);
  document.getElementById('svcSelect').innerHTML = list.map(s => `<option value="${s.id}">${esc(s.name)} — ${tl(s.price)} / 1000</option>`).join('');
  onSvcChange();
}
const curSvc = () => CATALOG.services.find(s => s.id === document.getElementById('svcSelect').value);
function onSvcChange() {
  const s = curSvc(), info = document.getElementById('svcInfo'), q = document.getElementById('orderQty');
  if (!s) { info.style.display = 'none'; return; }
  info.style.display = 'block';
  info.innerHTML = `<b>${esc(s.name)}</b><br>1000 adet: <b>${tl(s.price)}</b> · Min: <b>${s.min}</b> · Max: <b>${s.max.toLocaleString('tr-TR')}</b>${s.desc ? '<br>' + esc(s.desc) : ''}`;
  q.min = s.min; q.max = s.max; q.value = s.min;
  document.getElementById('qtyHint').textContent = `${s.min} – ${s.max.toLocaleString('tr-TR')} arası`;
  updateTotal();
}
function updateTotal() {
  const s = curSvc(), q = parseInt(document.getElementById('orderQty').value) || 0;
  document.getElementById('orderTotal').textContent = s && q > 0 ? tl(Math.max(1, Math.ceil(q * s.price / 1000))) : '₺0.00';
}

// ── Servis listesi sayfası ──
function renderSvcTabs() { document.getElementById('svcTabs').innerHTML = tabsHtml(tablePlatform, 'setTablePlatform'); }
function setTablePlatform(p) { tablePlatform = p; renderSvcTabs(); renderSvcTable(); }
function renderSvcTable() {
  const rows = CATALOG.services.filter(s => s.platform === tablePlatform);
  document.getElementById('svcTable').innerHTML = rows.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.category)}</td><td class="gold">${tl(s.price)}</td><td>${s.min}</td><td>${s.max.toLocaleString('tr-TR')}</td>
    <td><button class="btn btn-outline btn-sm" onclick="pickService('${s.id}')">Sipariş Ver</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Servis bulunamadı.</td></tr>';
}
function pickService(id) {
  const s = CATALOG.services.find(x => x.id === id); if (!s) return;
  orderPlatform = s.platform; renderOrderTabs(); fillCategories();
  document.getElementById('catSelect').value = s.category; fillServices();
  document.getElementById('svcSelect').value = id; onSvcChange();
  location.hash = '#/siparis';
}
