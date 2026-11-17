require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);

module.exports = {
  BRAND: 'JobGossipPlug',
  PORT: num(process.env.PORT, 5000),
  IS_PROD: process.env.NODE_ENV === 'production',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  TRUST_PROXY: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  // One-time: the email of an account that already exists, promoted to admin on the next start. Remove it afterwards.
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || '',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://127.0.0.1:5500,http://localhost:5500').split(',').map(s => s.trim()).filter(Boolean),
};
