const express = require('express');
const { db } = require('../lib/db');
const { authenticate, requireAdmin } = require('../lib/auth');
const { HttpError, cleanHttpsUrl } = require('../lib/util');
const { FIELD_KEYS, COUNTRY_SET } = require('../lib/catalog');

const router = express.Router();
router.use(authenticate, requireAdmin);

const text = (v, max, name, required = false) => {
  const s = String(v ?? '').trim();
  if (required && s.length < 2) throw new HttpError(400, `${name} is required.`);
  if (s.length > max) throw new HttpError(400, `${name} is too long (max ${max}).`);
  return s;
};

function cleanOpportunity(b = {}) {
  const apply_url = cleanHttpsUrl(b.apply_url);
  if (!apply_url) throw new HttpError(400, 'The company page must be a full https:// address.');
  let referral_url = null;
  if (String(b.referral_url ?? '').trim()) {
    referral_url = cleanHttpsUrl(b.referral_url);
    if (!referral_url) throw new HttpError(400, 'Your referral link must be a full https:// address (or leave it empty).');
  }
  const fields = [...new Set(Array.isArray(b.fields) ? b.fields.map(String) : [])];
  if (fields.some(f => !FIELD_KEYS.includes(f))) throw new HttpError(400, 'Invalid field selected.');
  const min_level = b.min_level === 'skilled' ? 'skilled' : 'entry';
  const country_mode = ['all', 'allow', 'block'].includes(b.country_mode) ? b.country_mode : 'all';
  const raw = Array.isArray(b.countries) ? b.countries : String(b.countries ?? '').split(/[\s,;]+/);
  const countries = [...new Set(raw.map(c => String(c).trim().toUpperCase()).filter(Boolean))];
  const bad = countries.find(c => !COUNTRY_SET.has(c));
  if (bad) throw new HttpError(400, `"${bad}" is not a valid 2-letter country code (Kenya is KE).`);
  if (country_mode !== 'all' && !countries.length) throw new HttpError(400, 'Add at least one country code for that country rule, or choose "No country rule".');
  const verified = String(b.verified_at ?? '').trim();
  if (verified && !/^\d{4}-\d{2}-\d{2}$/.test(verified)) throw new HttpError(400, 'Use a date like 2026-11-14.');
  const sort = Number.parseInt(b.sort_order, 10);
  return {
    company: text(b.company, 80, 'Company', true), title: text(b.title, 120, 'Title', true), summary: text(b.summary, 500, 'Description'),
    work_type: text(b.work_type, 60, 'Work type'), pay_note: text(b.pay_note, 120, 'Pay note'), notes: text(b.notes, 300, 'Private note'),
    fields, min_level, country_mode, countries: country_mode === 'all' ? [] : countries, apply_url, referral_url,
    verified_at: verified || null, active: b.active !== false, sort_order: Number.isFinite(sort) ? sort : 100,
  };
}

const ARGS = o => [o.company, o.title, o.summary, o.work_type, o.pay_note, o.fields, o.min_level, o.country_mode, o.countries, o.apply_url, o.referral_url, o.notes, o.verified_at, o.active, o.sort_order];

router.get('/opportunities', async (req, res) => {
  const r = await db.query(
    `SELECT o.*, to_char(o.verified_at, 'YYYY-MM-DD') AS verified_at,
            (SELECT count(*)::int FROM jp_clicks c WHERE c.opportunity_id = o.id) AS clicks,
            (SELECT count(*)::int FROM jp_clicks c WHERE c.opportunity_id = o.id AND c.created_at > now() - interval '7 days') AS clicks_7d
       FROM jp_opportunities o ORDER BY o.sort_order, o.id`);
  res.json({ success: true, opportunities: r.rows });
});

const dup = e => { if (e && e.code === '23505') throw new HttpError(409, 'There is already a listing with that company and title.'); throw e; };

router.post('/opportunities', async (req, res) => {
  const o = cleanOpportunity(req.body);
  const r = await db.query(
    `INSERT INTO jp_opportunities (company,title,summary,work_type,pay_note,fields,min_level,country_mode,countries,apply_url,referral_url,notes,verified_at,active,sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`, ARGS(o)).catch(dup);
  res.status(201).json({ success: true, id: r.rows[0].id });
});

router.put('/opportunities/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Invalid opportunity.');
  const o = cleanOpportunity(req.body);
  const r = await db.query(
    `UPDATE jp_opportunities SET company=$1,title=$2,summary=$3,work_type=$4,pay_note=$5,fields=$6,min_level=$7,country_mode=$8,countries=$9,
            apply_url=$10,referral_url=$11,notes=$12,verified_at=$13,active=$14,sort_order=$15,updated_at=now() WHERE id=$16 RETURNING id`, [...ARGS(o), id]).catch(dup);
  if (!r.rowCount) throw new HttpError(404, 'Opportunity not found.');
  res.json({ success: true });
});

// Quick save of just the referral link of one listing (empty = remove it). This is the link the Apply button uses.
router.patch('/opportunities/:id/referral', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Invalid opportunity.');
  const raw = String(req.body?.referral_url || '').trim();
  let url = null;
  if (raw) { url = cleanHttpsUrl(raw); if (!url) throw new HttpError(400, 'The referral link must be a full https:// address.'); }
  const r = await db.query(`UPDATE jp_opportunities SET referral_url = $1, updated_at = now() WHERE id = $2 RETURNING id`, [url, id]);
  if (!r.rowCount) throw new HttpError(404, 'Opportunity not found.');
  res.json({ success: true, referral_url: url });
});

router.delete('/opportunities/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Invalid opportunity.');
  await db.query(`DELETE FROM jp_opportunities WHERE id = $1`, [id]);
  res.json({ success: true });
});

/**
 * Paste your referral links in bulk.
 *  - default_url: one link used for every listing of that company that has none yet (or all of them if overwrite is on).
 *  - lines: one per line, "Listing title | https://your-link". The title may be partial if it only matches one listing.
 */
router.post('/referrals/bulk', async (req, res) => {
  const company = String(req.body?.company || '').trim();
  if (!company) throw new HttpError(400, 'Choose the company.');
  const overwrite = req.body?.overwrite === true;
  const all = (await db.query(`SELECT id, title, referral_url FROM jp_opportunities WHERE lower(company) = lower($1)`, [company])).rows;
  if (!all.length) throw new HttpError(404, 'No listings found for that company.');
  const result = { updated: 0, default_applied: 0, not_found: [], ambiguous: [], invalid: [] };

  const lines = String(req.body?.lines || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 500);
  const touched = new Set();
  for (const line of lines) {
    const m = line.match(/^(.*?)\s*(?:\||\t)\s*(\S+)\s*$/);
    if (!m) { result.invalid.push(line.slice(0, 80)); continue; }
    const url = cleanHttpsUrl(m[2]);
    if (!url) { result.invalid.push(line.slice(0, 80)); continue; }
    const want = m[1].trim().toLowerCase();
    let hit = all.filter(o => o.title.toLowerCase() === want);
    if (!hit.length && want.length >= 4) hit = all.filter(o => o.title.toLowerCase().includes(want));
    if (!hit.length) { result.not_found.push(m[1].trim().slice(0, 80)); continue; }
    if (hit.length > 1) { result.ambiguous.push(m[1].trim().slice(0, 80)); continue; }
    await db.query(`UPDATE jp_opportunities SET referral_url = $1, updated_at = now() WHERE id = $2`, [url, hit[0].id]);
    touched.add(hit[0].id); result.updated++;
  }

  if (String(req.body?.default_url || '').trim()) {
    const url = cleanHttpsUrl(req.body.default_url);
    if (!url) throw new HttpError(400, 'The one link for all listings must be a full https:// address.');
    for (const o of all) {
      if (touched.has(o.id) || (o.referral_url && !overwrite)) continue;
      await db.query(`UPDATE jp_opportunities SET referral_url = $1, updated_at = now() WHERE id = $2`, [url, o.id]);
      result.default_applied++;
    }
  }
  res.json({ success: true, ...result });
});

router.get('/stats', async (req, res) => {
  const [u, c, top, recent] = await Promise.all([
    db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS week FROM jp_users`),
    db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE referral)::int AS referral FROM jp_clicks`),
    db.query(`SELECT trim(country) AS country, count(*)::int AS n FROM jp_users GROUP BY 1 ORDER BY n DESC LIMIT 5`),
    db.query(`SELECT full_name, email, trim(country) AS country, level, created_at FROM jp_users ORDER BY created_at DESC LIMIT 15`),
  ]);
  res.json({ success: true, users: u.rows[0], clicks: c.rows[0], top_countries: top.rows, recent_users: recent.rows });
});

module.exports = router;
