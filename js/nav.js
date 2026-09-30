let currentUser = null; // {name, email, balance (kuruş)}
function setUser(u) { currentUser = u ? { name: u.name, email: u.email, balance: u.balance } : null; }
async function loadMe() { try { setUser((await api('/api/auth')).user); } catch { setUser(null); } }
async function refreshUser() { await loadMe(); renderNav(); }

function renderNav() {
  const nr = document.getElementById('navRight');
  if (currentUser) {
    const initials = currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    nr.innerHTML = `
      <a class="balance-badge" href="#/bakiye">${ic('wallet')}<span>${tl(currentUser.balance)}</span></a>
      <div class="user-menu-wrap">
        <div class="user-btn" onclick="toggleUserMenu()"><div class="user-avatar">${esc(initials)}</div><span class="user-name">${esc(currentUser.name.split(' ')[0])}</span>${ic('chev')}</div>
        <div class="user-dropdown" id="userDropdown">
          <div class="dd-info"><b>${esc(currentUser.name)}</b><small>${esc(currentUser.email)}</small></div>
          <a class="dd-item" href="#/bakiye" onclick="closeDropdown()">${ic('wallet')}Bakiye Yükle</a>
          <a class="dd-item" href="#/gecmis" onclick="closeDropdown()">${ic('list')}Siparişlerim</a>
          <div class="dd-item logout" onclick="handleLogout()">${ic('logout')}Çıkış Yap</div>
        </div>
      </div>`;
  } else {
    nr.innerHTML = `<button class="btn btn-outline btn-sm" onclick="openModal('auth');switchTab('login')">Giriş Yap</button>
                    <button class="btn btn-gold btn-sm" onclick="openModal('auth');switchTab('register')">Kayıt Ol</button>`;
  }
  const sb = document.getElementById('sideBalance'); if (sb) sb.textContent = tl(currentUser ? currentUser.balance : 0);
  const tb = document.getElementById('topupBalance'); if (tb) tb.textContent = tl(currentUser ? currentUser.balance : 0);
}
function toggleUserMenu() { const d = document.getElementById('userDropdown'); if (d) d.classList.toggle('open'); }
function closeDropdown() { const d = document.getElementById('userDropdown'); if (d) d.classList.remove('open'); }
function toggleMenu() { document.getElementById('navLinks').classList.toggle('open'); }
document.addEventListener('click', e => {
  const w = document.querySelector('.user-menu-wrap');
  if (w && !w.contains(e.target)) closeDropdown();
});
