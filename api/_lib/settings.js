// Havale bilgileri: admin panelinden değiştirilen değerler (DB) öncelikli, yoksa bank.js varsayılanı.
const sql = require('./db');
const defaults = require('./bank');

async function getBank() {
  const out = { NAME: defaults.NAME, IBAN: defaults.IBAN, DESC: defaults.DESC, MINUTES: defaults.MINUTES };
  try {
    const r = await sql`SELECT value FROM settings WHERE key = 'bank'`;
    if (r.length) {
      const v = JSON.parse(r[0].value);
      if (v.NAME) out.NAME = v.NAME;
      if (v.IBAN) out.IBAN = v.IBAN;
      if (v.DESC) out.DESC = v.DESC;
    }
  } catch (e) { console.error('bank settings', e); }
  return out;
}

async function saveBank({ NAME, IBAN, DESC }) {
  const v = JSON.stringify({ NAME, IBAN, DESC });
  await sql`INSERT INTO settings (key, value) VALUES ('bank', ${v})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

module.exports = { getBank, saveBank };
