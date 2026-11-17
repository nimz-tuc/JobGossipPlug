const express = require('express');
const { db } = require('../lib/db');
const { authenticate } = require('../lib/auth');
const { HttpError, rateLimit } = require('../lib/util');
const { evaluate, sortForUser } = require('../lib/match');

const router = express.Router();
router.use(authenticate);

const COLS = `id, company, title, summary, work_type, pay_note, fields, min_level, country_mode, countries, apply_url, referral_url, verified_at, sort_order`;
// Visitors never receive the link itself. They get a short, public description, and the link only when they press Apply.
const view = o => ({
  id: o.id, company: o.company, title: o.title, summary: o.summary, work_type: o.work_type, pay_note: o.pay_note, fields: o.fields,
  beginner_friendly: o.min_level === 'entry', is_referral: !!o.referral_url, verified_at: o.verified_at, field_match: !!o.field_match, reason: o.reason,
});

router.get('/opportunities', async (req, res) => {
  const r = await db.query(`SELECT ${COLS} FROM jp_opportunities WHERE active = TRUE`);
  const { eligible, unavailable } = sortForUser(r.rows, req.user);
  res.json({ success: true, eligible: eligible.map(view), unavailable: unavailable.map(view) });
});

// Pressing Apply: re-check the rules on the server, count the click, and hand back the address to open.
router.post('/opportunities/:id/click', rateLimit({ windowMs: 60_000, max: 30, keyFn: r => String(r.user?.id) }), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Invalid opportunity.');
  const r = await db.query(`SELECT ${COLS} FROM jp_opportunities WHERE id = $1 AND active = TRUE`, [id]);
  const o = r.rows[0];
  if (!o || !evaluate(o, req.user).ok) throw new HttpError(404, 'This opportunity is not available for your profile.');
  const url = o.referral_url || o.apply_url;
  await db.query(`INSERT INTO jp_clicks (opportunity_id, user_id, referral) VALUES ($1,$2,$3)`, [o.id, req.user.id, !!o.referral_url]);
  res.json({ success: true, url, referral: !!o.referral_url });
});

module.exports = router;
