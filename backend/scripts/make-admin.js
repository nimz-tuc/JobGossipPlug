// Usage: node scripts/make-admin.js you@example.com   (promotes an existing account to admin; register it on the site first)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { db } = require('../lib/db');
(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) throw new Error('Usage: node scripts/make-admin.js you@example.com');
  const r = await db.query(`UPDATE jp_users SET role = 'admin', updated_at = now() WHERE lower(email) = $1 RETURNING full_name, email`, [email]);
  if (!r.rowCount) throw new Error('No account found for ' + email + '. Register it on the site first, then run this again.');
  console.log(`${r.rows[0].full_name} <${r.rows[0].email}> is now an admin.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.end());
