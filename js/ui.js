function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'error' ? 'error' : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3300);
}
function showErr(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
function hideErr(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function openModal(t) { if (t === 'auth') document.getElementById('authModal').classList.add('open'); }
function closeModal(t) { if (t === 'auth') document.getElementById('authModal').classList.remove('open'); }
function openSupport() { document.getElementById('supportModal').classList.add('open'); }
function closeSupport() { document.getElementById('supportModal').classList.remove('open'); }
document.getElementById('supportModal').addEventListener('click', function (e) { if (e.target === this) closeSupport(); });
function switchTab(tab) {
  const login = tab === 'login';
  document.getElementById('loginTab').classList.toggle('active', login);
  document.getElementById('registerTab').classList.toggle('active', !login);
  document.getElementById('loginPanel').classList.toggle('active', login);
  document.getElementById('registerPanel').classList.toggle('active', !login);
}
document.getElementById('authModal').addEventListener('click', function (e) { if (e.target === this) closeModal('auth'); });

// ── Sayfa yönlendirici (#/sayfa) ──
const VIEWS = ['home', 'siparis', 'servisler', 'sms', 'bakiye', 'gecmis'];
const AUTH_VIEWS = ['bakiye', 'gecmis'];
function route() {
  let v = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  if (!VIEWS.includes(v)) v = 'home';
  if (AUTH_VIEWS.includes(v) && !currentUser) {
    history.replaceState(null, '', '#/');
    v = 'home'; openModal('auth'); switchTab('login'); showToast('Bu sayfa için giriş yapmalısınız.', 'error');
  }
  document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.dataset.view === v));
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === v));
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo(0, 0);
  if (v !== 'bakiye') stopPayTimers();
  if (v === 'bakiye') { initTopup(); renderNav(); }
  if (v === 'gecmis') loadHistory();
  if (v === 'sms') resumeSms();
  if (v === 'siparis') renderNav();
}
window.addEventListener('hashchange', route);
