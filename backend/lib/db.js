const { Pool } = require('pg');

// Render gives one DATABASE_URL. Locally you can use DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD instead.
const local = !process.env.DATABASE_URL && /^(localhost|127\.0\.0\.1)?$/.test(process.env.DB_HOST || '');
const db = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : { host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD }),
  ssl: local || process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
});
db.on('error', e => console.error('Unexpected database error:', e.message));

module.exports = { db };
