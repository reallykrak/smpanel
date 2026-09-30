async function handleOrder() {
  const s = curSvc();
  const link = document.getElementById('orderLink').value.trim();
  const qty = parseInt(document.getElementById('orderQty').value) || 0;
  if (!currentUser) { openModal('auth'); switchTab('login'); showToast('Sipariş vermek için giriş yapınız.', 'error'); return; }
  if (!s) { showToast('Lütfen bir servis seçin.', 'error'); return; }
  if (!link) { showToast('Lütfen linki giriniz.', 'error'); document.getElementById('orderLink').focus(); return; }
  if (qty < s.min || qty > s.max) { showToast(`Miktar ${s.min} ile ${s.max} arasında olmalıdır.`, 'error'); return; }
  try {
    const d = await api('/api/order', { method: 'POST', body: { service: s.id, link, quantity: qty } });
    currentUser.balance = d.balance; renderNav();
    document.getElementById('orderLink').value = '';
    onSvcChange();
    showToast('Siparişiniz alındı ve işleme başladı. Sipariş No: ' + d.orderId);
  } catch (e) {
    showToast(e.message, 'error');
    if (/bakiye/i.test(e.message)) location.hash = '#/bakiye';
  }
}
