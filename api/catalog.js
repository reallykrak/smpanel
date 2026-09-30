const { SERVICES, SMS, COUNTRIES } = require('./_lib/catalog');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60');
  const sms = SMS.map(s => ({
    id: s.id, name: s.name,
    countries: Object.entries(s.prices).map(([cid, tl]) => ({ id: cid, name: COUNTRIES[cid].name, code: COUNTRIES[cid].code, price: tl * 100 }))
  }));
  res.json({ services: SERVICES, sms });
};
