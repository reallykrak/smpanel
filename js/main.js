(async () => {
  if (WHATSAPP) { const a = document.getElementById('waLink'); a.href = 'https://wa.me/' + WHATSAPP; a.style.display = 'block'; document.getElementById('supWa').href = a.href; }
  if (TELEGRAM) { const a = document.getElementById('tgLink'); a.href = 'https://t.me/' + TELEGRAM; a.style.display = 'block'; document.getElementById('supTg').href = a.href; }
  await Promise.all([loadMe(), loadCatalog()]);
  renderNav();

  route();
  resumeSms(); // açık numara varsa Destek'te göster
})();
