const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function setField(inputId, errId, ok) {
  const i = document.getElementById(inputId);
  i.classList.toggle('err', !ok);
  if (!ok) showErr(errId);
}
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value;
  ['loginEmailErr', 'loginPassErr', 'loginGenErr'].forEach(hideErr);
  const eOk = EMAIL_RE.test(email), pOk = pass.length >= 1;
  setField('loginEmail', 'loginEmailErr', eOk); setField('loginPassword', 'loginPassErr', pOk);
  if (!eOk || !pOk) return;
  try {
    const d = await api('/api/auth', { method: 'POST', body: { action: 'login', email, password: pass } });
    setUser(d.user); closeModal('auth'); renderNav(); route(); resumeSms();
    showToast('Hoş geldiniz, ' + d.user.name.split(' ')[0]);
  } catch (e) { document.getElementById('loginGenErr').textContent = e.message; showErr('loginGenErr'); }
}
async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPassword').value;
  ['regNameErr', 'regEmailErr', 'regPassErr', 'regGenErr'].forEach(hideErr);
  const nOk = name.length >= 2, eOk = EMAIL_RE.test(email), pOk = pass.length >= 8;
  setField('regName', 'regNameErr', nOk); setField('regEmail', 'regEmailErr', eOk); setField('regPassword', 'regPassErr', pOk);
  if (!nOk || !eOk || !pOk) return;
  try {
    const d = await api('/api/auth', { method: 'POST', body: { action: 'register', name, email, password: pass } });
    setUser(d.user); closeModal('auth'); renderNav(); route(); resumeSms();
    showToast('Hesabınız oluşturuldu. Hoş geldiniz!');
  } catch (e) { document.getElementById('regGenErr').textContent = e.message; showErr('regGenErr'); }
}
async function handleLogout() {
  try { await api('/api/auth', { method: 'POST', body: { action: 'logout' } }); } catch {}
  currentUser = null; activeSms = null; stopSmsPoll(); renderSupportSms(); closeDropdown(); renderNav();
  location.hash = '#/'; route(); showToast('Çıkış yapıldı.');
}

// Enter tuşu ile giriş / kayıt
['loginEmail', 'loginPassword'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));
['regName', 'regEmail', 'regPassword'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); }));
