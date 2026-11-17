// Creates the tables (safe to repeat) and adds the three starter opportunities the first time only.
const fs = require('fs');
const path = require('path');

const SEED = [
  {
    company: 'micro1', title: 'AI training and evaluation projects',
    summary: 'micro1 recruits people for AI training and evaluation projects. What you can apply for, and what it pays, depends on the project and on your location.',
    work_type: 'Project-based', pay_note: 'Set per project by micro1', fields: ['tech', 'data', 'writing', 'general'],
    min_level: 'entry', apply_url: 'https://www.micro1.ai/', sort_order: 20,
    notes: 'Add YOUR micro1 referral/affiliate link. Confirm beginners are accepted and set any country rules before going live.',
  },
  {
    company: 'AfterQuery', title: 'Expert data projects (engineering, finance, law, medicine)',
    summary: 'AfterQuery works with practising professionals on expert data projects. Rates and terms are set in each contract.',
    work_type: 'Expert projects', pay_note: 'Set in each contract', fields: ['tech', 'finance', 'law', 'medicine'],
    min_level: 'skilled', apply_url: 'https://www.afterquery.com/', sort_order: 30,
    notes: 'No official worker referral program found. Leave the referral link empty (no disclosure is shown) unless AfterQuery gives YOU one.',
  },
];

/** Adds a company's listings from a data file, one batch at a time, once. Never re-adds a listing you delete. */
async function importCompany(db, { company, file, url, prefix, hidePlaceholder }) {
  const all = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'));
  for (const batch of [...new Set(all.map(o => o.batch || 1))].sort()) {
    const KEY = prefix + batch;
    if ((await db.query('SELECT 1 FROM jp_meta WHERE key = $1', [KEY])).rowCount) continue;
    let added = 0;
    for (const o of all.filter(x => (x.batch || 1) === batch)) {
      const r = await db.query(
        `INSERT INTO jp_opportunities (company, title, summary, work_type, pay_note, fields, min_level, country_mode, countries, apply_url, notes, sort_order)
         VALUES ('${company}',$1,$2,$3,$4,$5,$6,$7,$8,'${url}',$9,100) ON CONFLICT DO NOTHING`,
        [o.title, o.summary, o.work_type, o.pay_note, o.fields, o.min_level, o.country_mode, o.countries, o.notes]);
      added += r.rowCount || 0;
    }
    if (hidePlaceholder) await db.query(`UPDATE jp_opportunities SET active = FALSE WHERE company = 'Mercor' AND title LIKE 'Expert contract projects%' AND referral_url IS NULL`);
    await db.query('INSERT INTO jp_meta (key) VALUES ($1) ON CONFLICT DO NOTHING', [KEY]);
    console.log(`Imported ${added} ${company} listing(s) (batch ${batch}).`);
  }
}
const importMercor = db => importCompany(db, { company: 'Mercor', file: 'mercor-listings.json', url: 'https://www.mercor.com/', prefix: 'mercor_import_v', hidePlaceholder: true });
const importAfterQuery = db => importCompany(db, { company: 'AfterQuery', file: 'afterquery-listings.json', url: 'https://www.afterquery.com/', prefix: 'afterquery_import_v' });
const importMicro1 = db => importCompany(db, { company: 'micro1', file: 'micro1-listings.json', url: 'https://www.micro1.ai/', prefix: 'micro1_import_v' });

/** Attaches YOUR referral links (data/referral-links.json) to the listings, once per file version. Never overwrites a link you already set yourself. */
async function applyReferralLinks(db) {
  const file = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'referral-links.json'), 'utf8'));
  const KEY = 'referral_links_v' + file.version;
  if ((await db.query('SELECT 1 FROM jp_meta WHERE key = $1', [KEY])).rowCount) return;
  let n = 0;
  for (const l of file.links) {
    const r = await db.query(
      `UPDATE jp_opportunities SET referral_url = $1, apply_url = $2 WHERE lower(company) = lower($3) AND lower(title) = lower($4) AND referral_url IS NULL`,
      [l.url, l.apply, l.company, l.title]);
    n += r.rowCount || 0;
  }
  await db.query('INSERT INTO jp_meta (key) VALUES ($1) ON CONFLICT DO NOTHING', [KEY]);
  console.log(`Attached ${n} referral link(s).`);
}

/** One time: deletes the listings that have no referral link of yours (list in data/removed-listings.json). A listing you gave a link yourself is kept. */
async function pruneListings(db) {
  const file = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'removed-listings.json'), 'utf8'));
  const KEY = 'prune_listings_v' + file.version;
  if ((await db.query('SELECT 1 FROM jp_meta WHERE key = $1', [KEY])).rowCount) return;
  let n = 0;
  for (const l of file.titles) {
    const r = await db.query(`DELETE FROM jp_opportunities WHERE lower(company) = lower($1) AND lower(title) = lower($2) AND referral_url IS NULL`, [l.company, l.title]);
    n += r.rowCount || 0;
  }
  await db.query('INSERT INTO jp_meta (key) VALUES ($1) ON CONFLICT DO NOTHING', [KEY]);
  console.log(`Removed ${n} listing(s) that have no referral link.`);
}

async function run(db) {
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'base.sql'), 'utf8'));
  const n = await db.query('SELECT count(*)::int AS n FROM jp_opportunities');
  if (n.rows[0].n === 0) {
    for (const o of SEED) {
      await db.query(
        `INSERT INTO jp_opportunities (company, title, summary, work_type, pay_note, fields, min_level, apply_url, sort_order, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [o.company, o.title, o.summary, o.work_type, o.pay_note, o.fields, o.min_level, o.apply_url, o.sort_order, o.notes]);
    }
    console.log('Added the starter opportunities.');
  }
  await importMercor(db);
  await importAfterQuery(db);
  await importMicro1(db);
  await applyReferralLinks(db);
  await pruneListings(db);
}

module.exports = { run, importMercor, importAfterQuery, importMicro1, applyReferralLinks, pruneListings, SEED };
