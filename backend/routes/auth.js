const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../lib/db');
const { signToken, authenticate } = require('../lib/auth');
const { JWT_EXPIRES_IN } = require('../lib/config');
const { HttpError, rateLimit } = require('../lib/util');
const { FIELD_KEYS, LEVELS, COUNTRY_SET } = require('../lib/catalog');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // unknown e-mails take as long to reject as real ones

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  keyFn: req => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many sign-ups from this network. Please try again later.' });

/** Validates the profile part shared by sign-up and "edit profile". */
function cleanProfile(b) {
  const country = String(b?.country || '').toUpperCase();
  if (!COUNTRY_SET.has(country)) throw new HttpError(400, 'Please choose your country.');
  const level = String(b?.level || '');
  if (!LEVELS.includes(level)) throw new HttpError(400, 'Please tell us whether you are starting out or have professional skills.');
  const fields = [...new Set(Array.isArray(b?.fields) ? b.fields.map(String) : [])];
  if (fields.some(f => !FIELD_KEYS.includes(f))) throw new HttpError(400, 'Invalid field selected.');
  if (level === 'skilled' && !fields.length) throw new HttpError(400, 'Pick at least one field you have skills in.');
  return { country, level, fields };
}

const publicUser = u => ({ id: u.id, full_name: u.full_name, email: u.email, country: u.country.trim(), level: u.level, fields: u.fields, role: u.role });

router.post('/register', registerLimiter, async (req, res) => {
  const { full_name, email, password, consent } = req.body || {};
  if (!full_name || !email || !password) throw new HttpError(400, 'Full name, email and password are required.');
  const name = String(full_name).trim(), mail = String(email).trim().toLowerCase();
  if (name.length < 2 || name.length > 120) throw new HttpError(400, 'Please provide a valid full name.');
  if (!EMAIL_RE.test(mail) || mail.length > 255) throw new HttpError(400, 'Please provide a valid email address.');
  if (String(password).length < 8 || String(password).length > 200) throw new HttpError(400, 'Password must contain at least 8 characters.');
  if (consent !== true) throw new HttpError(400, 'Please accept the privacy note to create an account.');
  const p = cleanProfile(req.body);
  const hash = await bcrypt.hash(String(password), 12);
  try {
    const r = await db.query(
      `INSERT INTO jp_users (full_name, email, password_hash, country, level, fields) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, full_name, email, country, level, fields, role`, [name, mail, hash, p.country, p.level, p.fields]);
    res.status(201).json({ success: true, user: publicUser(r.rows[0]) });
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'An account with this email already exists.');
    throw e;
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'Email and password are required.');
  const r = await db.query(`SELECT id, full_name, email, password_hash, country, level, fields, role, status FROM jp_users WHERE lower(email) = $1`, [String(email).trim().toLowerCase()]);
  const user = r.rows[0];
  const ok = await bcrypt.compare(String(password), user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password.');
  if (user.status !== 'active') throw new HttpError(403, 'This account has been suspended.');
  res.json({ success: true, token: signToken(user, JWT_EXPIRES_IN), user: publicUser(user) });
});

router.get('/me', authenticate, (req, res) => res.json({ success: true, user: publicUser(req.user) }));

router.patch('/me', authenticate, async (req, res) => {
  const name = String(req.body?.full_name ?? req.user.full_name).trim();
  if (name.length < 2 || name.length > 120) throw new HttpError(400, 'Please provide a valid full name.');
  const p = cleanProfile(req.body);
  const r = await db.query(
    `UPDATE jp_users SET full_name = $2, country = $3, level = $4, fields = $5, updated_at = now() WHERE id = $1
     RETURNING id, full_name, email, country, level, fields, role`, [req.user.id, name, p.country, p.level, p.fields]);
  res.json({ success: true, user: publicUser(r.rows[0]) });
});

module.exports = router;
