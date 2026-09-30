// Bekleyen yatırımı atomik olarak "paid" yapar ve bakiyeyi ekler. İki kez çalışsa bile bir kez ekler.
module.exports = async function credit(sql, oid) {
  const r = await sql`
    WITH d AS (
      UPDATE deposits SET status = 'paid'
      WHERE oid = ${oid} AND status = 'pending'
      RETURNING user_id, amount
    )
    UPDATE users SET balance = users.balance + d.amount
    FROM d WHERE users.id = d.user_id
    RETURNING users.id`;
  return r.length > 0;
};
