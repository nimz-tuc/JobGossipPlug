// Creates the tables (safe to repeat) and adds the three starter opportunities the first time only.
const fs = require('fs');
const path = require('path');

const SEED = [
  {
    company: 'micro1', title: 'AI training and evaluation projects',
    summary: 'micro1 recruits people for AI training and evaluation projects. What you can apply for, and what it pays, depends on the project and on your location.',
    work_type: 'Project-based', pay_note: 'Set per project by micro1', fields: ['tech', 'data', 'writing', 'general'],
    min_level: 'skilled', apply_url: 'https://www.micro1.ai/', sort_order: 20,
    notes: 'Add YOUR micro1 referral/affiliate link. Confirm project requirements and set any country rules before going live.',
  },
  {
    company: 'AfterQuery', title: 'Expert data projects (engineering, finance, law, medicine)',
    summary: 'AfterQuery works with practising professionals on expert data projects. Rates and terms are set in each contract.',
    work_type: 'Expert projects', pay_note: 'Set in each contract', fields: ['tech', 'finance', 'law', 'medicine'],
    min_level: 'skilled', apply_url: 'https://www.afterquery.com/', sort_order: 30,
    notes: 'No official worker referral program found. Leave the referral link empty (no disclosure is shown) unless AfterQuery gives YOU one.',
  },
];

const APPLICATION_USER_ROLES = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'data', 'mercor-listings.json'), 'utf8',
)).filter(o => /^Application Users\b/i.test(o.title))
  .map(o => ({ company: 'Mercor', title: o.title }));

// Add future no-experience roles here; Mercor Application Users roles are included automatically.
const STUDENT_STARTER_ROLES = [
  { company: 'AfterQuery', title: 'Students Across All Disciplines (Undergrad)' },
  { company: 'micro1', title: 'AI Conversation Evaluator' },
  { company: 'micro1', title: 'Generalist' },
  { company: 'micro1', title: 'Smartphone Video Recorder' },
  ...APPLICATION_USER_ROLES,
];
const isStudentStarterRole = (company, title) => STUDENT_STARTER_ROLES.some(
  role => role.company.toLowerCase() === company.toLowerCase() && role.title.toLowerCase() === title.toLowerCase(),
);
const studentMinLevel = (company, title, minLevel) => {
  if (isStudentStarterRole(company, title)) return 'entry';
  return minLevel === 'entry' ? 'skilled' : minLevel;
};

const CATALOG_RULE_FIXES = [
  ...[
    ['micro1', 'Generalist - Korean Speaker'],
    ['micro1', 'Generalist - Mandarin Speaker'],
    ['micro1', 'Senior AI Trainer (US Based)'],
    ['AfterQuery', 'Arcade/Gaming Experts'],
    ['AfterQuery', 'Competitive Programming Expert'],
    ['AfterQuery', 'Law Student Expert'],
    ['Mercor', 'Application Users - Blender on Windows - Generalist'],
    ['Mercor', '3D Generalist: Modeling, Rigging & Animation (AI Evaluation)'],
    ['Mercor', 'Application Users - DaVinci Resolve on macOS - Generalist'],
    ['Mercor', 'Application Users - Unreal Engine on Windows - Generalist'],
    ['Mercor', 'Application Users - FruitLoops Studio on Windows - Generalist'],
    ['Mercor', 'Application Users - Adobe Illustrator on Windows - Generalist'],
    ['Mercor', 'Application Users - Premiere on Windows - Generalist'],
    ['Mercor', 'Application Users - Photoshop on Windows - Generalist'],
    ['Mercor', 'Bilingual Chinese Generalist Expert — AI Safety'],
    ['Mercor', 'Bilingual Hindi Generalist Expert — AI Safety'],
    ['Mercor', 'Bilingual Spanish Generalist Expert — AI Safety'],
  ].map(([company, title]) => ({ company, title, min_level: 'skilled', previous_min_level: 'entry' })),
  { company: 'micro1', title: 'Video Recorder (San Francisco)', country_mode: 'allow', countries: ['US'], previous_country_mode: 'all' },
  { company: 'micro1', title: 'At Home Video Recorder (Japan)', country_mode: 'allow', countries: ['JP'], previous_country_mode: 'all' },
  { company: 'micro1', title: 'English Voice Expert (US)', country_mode: 'allow', countries: ['US'], previous_country_mode: 'all' },
  { company: 'micro1', title: 'Litigator / Practicing Attorney (US)', country_mode: 'allow', countries: ['US'], previous_country_mode: 'all' },
  { company: 'AfterQuery', title: 'Content Writer & AI Evaluation Specialist (UK/US)', country_mode: 'allow', countries: ['GB', 'US'], previous_country_mode: 'all' },
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
        [o.title, o.summary, o.work_type, o.pay_note, o.fields, studentMinLevel(company, o.title, o.min_level), o.country_mode, o.countries, o.notes]);
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

/** Ensures a newly added referral listing is inserted even if all earlier Micro1 import batches have already run. */
async function ensureSmartphoneVideoRecorder(db) {
  const KEY = 'smartphone_video_recorder_v1';
  if ((await db.query('SELECT 1 FROM jp_meta WHERE key = $1', [KEY])).rowCount) return;
  await db.query(
    `INSERT INTO jp_opportunities
       (company, title, summary, work_type, pay_note, fields, min_level, country_mode, countries, apply_url, notes, sort_order)
     VALUES
       ('micro1', 'Smartphone Video Recorder',
        'Hourly contract work, as listed on micro1''s job board. micro1 decides who is accepted and can change the role, hours or pay, or close it, at any time.',
        'Hourly contract work', '$14 - $15 / hour (as listed by micro1)',
        ARRAY['general','creative'], 'entry', 'all', ARRAY[]::text[],
        'https://jobs.micro1.ai/post/8944ed79-063d-43e2-a244-bd3185fbfb43',
        '4000 openings. Skills listed: Household task, Attention to detail, Video recording.', 100)
     ON CONFLICT (lower(company), lower(title)) DO UPDATE SET
       summary = EXCLUDED.summary,
       work_type = EXCLUDED.work_type,
       pay_note = EXCLUDED.pay_note,
       fields = EXCLUDED.fields,
       min_level = EXCLUDED.min_level,
       country_mode = EXCLUDED.country_mode,
       countries = EXCLUDED.countries,
       apply_url = EXCLUDED.apply_url,
       notes = EXCLUDED.notes,
       active = TRUE,
       updated_at = now()`,
  );
  await db.query('INSERT INTO jp_meta (key) VALUES ($1) ON CONFLICT DO NOTHING', [KEY]);
  console.log('Ensured the Smartphone Video Recorder listing exists.');
}

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

/** Applies one-time catalog corrections without replacing rules an admin already changed. */
async function applyCatalogRuleFixes(db) {
  const KEY = 'catalog_rules_v1';
  if ((await db.query('SELECT 1 FROM jp_meta WHERE key = $1', [KEY])).rowCount) return;
  let updated = 0;
  for (const fix of CATALOG_RULE_FIXES) {
    const r = await db.query(
      `UPDATE jp_opportunities
          SET min_level = COALESCE($1, min_level),
              country_mode = COALESCE($2, country_mode),
              countries = COALESCE($3::text[], countries),
              updated_at = now()
        WHERE lower(company) = lower($4) AND lower(title) = lower($5)
          AND ($6::text IS NULL OR min_level = $6)
          AND ($7::text IS NULL OR (country_mode = $7 AND cardinality(countries) = 0))`,
      [
        fix.min_level || null, fix.country_mode || null, fix.countries || null,
        fix.company, fix.title, fix.previous_min_level || null, fix.previous_country_mode || null,
      ]);
    updated += r.rowCount || 0;
  }
  await db.query('INSERT INTO jp_meta (key) VALUES ($1) ON CONFLICT DO NOTHING', [KEY]);
  console.log(`Corrected rules for ${updated} existing listing(s).`);
}

/** Limits student feeds to the explicitly selected starter roles. */
async function applyStudentOpportunityRules(db) {
  const KEY = 'student_roles_v2';
  if ((await db.query('SELECT 1 FROM jp_meta WHERE key = $1', [KEY])).rowCount) return;
  const allowSql = STUDENT_STARTER_ROLES.map((_, i) =>
    `(lower(company) = lower($${i * 2 + 1}) AND lower(title) = lower($${i * 2 + 2}))`).join(' OR ');
  const args = STUDENT_STARTER_ROLES.flatMap(role => [role.company, role.title]);
  const updated = await db.query(
    `UPDATE jp_opportunities SET min_level = 'skilled', updated_at = now()
      WHERE min_level = 'entry' AND NOT (${allowSql})`, args);
  let retained = 0;
  for (const role of STUDENT_STARTER_ROLES) {
    const r = await db.query(
      `UPDATE jp_opportunities SET min_level = 'entry', updated_at = now()
        WHERE lower(company) = lower($1) AND lower(title) = lower($2) AND min_level <> 'entry'`,
      [role.company, role.title]);
    retained += r.rowCount || 0;
  }
  await db.query('INSERT INTO jp_meta (key) VALUES ($1) ON CONFLICT DO NOTHING', [KEY]);
  console.log(`Limited student eligibility to the starter roles (${(updated.rowCount || 0) + retained} rule updates).`);
}

/** Adds application-user listings to the starter set for databases already migrated to v1. */
async function applyApplicationUserStudentRules(db) {
  const KEY = 'student_application_users_v1';
  if ((await db.query('SELECT 1 FROM jp_meta WHERE key = $1', [KEY])).rowCount) return;
  let updated = 0;
  for (const role of APPLICATION_USER_ROLES) {
    const r = await db.query(
      `UPDATE jp_opportunities SET min_level = 'entry', updated_at = now()
        WHERE lower(company) = lower($1) AND lower(title) = lower($2) AND min_level <> 'entry'`,
      [role.company, role.title]);
    updated += r.rowCount || 0;
  }
  await db.query('INSERT INTO jp_meta (key) VALUES ($1) ON CONFLICT DO NOTHING', [KEY]);
  console.log(`Added ${updated} Application Users role(s) to student opportunities.`);
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
  await ensureSmartphoneVideoRecorder(db);
  await applyReferralLinks(db);
  await pruneListings(db);
  await applyCatalogRuleFixes(db);
  await applyStudentOpportunityRules(db);
  await applyApplicationUserStudentRules(db);
}

module.exports = {
  run, importMercor, importAfterQuery, importMicro1, applyReferralLinks, pruneListings,
  applyCatalogRuleFixes, applyStudentOpportunityRules, applyApplicationUserStudentRules,
  ensureSmartphoneVideoRecorder, studentMinLevel, SEED,
};
