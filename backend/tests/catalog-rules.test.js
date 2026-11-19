const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { FIELDS } = require('../lib/catalog');
const { studentMinLevel } = require('../scripts/migrate');

const dataPath = name => path.join(__dirname, '..', 'data', name);
const listings = {
  micro1: JSON.parse(fs.readFileSync(dataPath('micro1-listings.json'), 'utf8')),
  AfterQuery: JSON.parse(fs.readFileSync(dataPath('afterquery-listings.json'), 'utf8')),
  Mercor: JSON.parse(fs.readFileSync(dataPath('mercor-listings.json'), 'utf8')),
};
const find = (company, title) => listings[company].find(o => o.title === title);

test('general field has a descriptive label without claiming roles need no skills', () => {
  assert.equal(FIELDS.find(f => f.key === 'general').label, 'Starter & generalist opportunities');
});

test('starter roles and all Application Users roles are available to students', () => {
  const effectiveStudentRoles = Object.entries(listings).flatMap(([company, rows]) =>
    rows.filter(o => studentMinLevel(company, o.title, o.min_level) === 'entry')
      .map(o => `${company}:${o.title}`)).sort();
  const applicationUserRoles = listings.Mercor
    .filter(o => o.title.startsWith('Application Users -'))
    .map(o => `Mercor:${o.title}`);

  assert.deepEqual(effectiveStudentRoles, [
    'AfterQuery:Students Across All Disciplines (Undergrad)',
    'micro1:AI Conversation Evaluator',
    'micro1:Generalist',
    'micro1:Smartphone Video Recorder',
    ...applicationUserRoles,
  ].sort());
  assert.ok(applicationUserRoles.length > 0);
  for (const [company, title] of [
    ['micro1', 'Generalist'],
    ['micro1', 'AI Conversation Evaluator'],
    ['AfterQuery', 'Students Across All Disciplines (Undergrad)'],
  ]) {
    assert.ok(find(company, title).fields.includes('general'), `${title} should be in the starter category`);
  }
});

test('explicitly location-specific roles have country allow-lists', () => {
  const roles = [
    ['micro1', 'Video Recorder (San Francisco)', ['US']],
    ['micro1', 'At Home Video Recorder (Japan)', ['JP']],
    ['micro1', 'English Voice Expert (US)', ['US']],
    ['micro1', 'Litigator / Practicing Attorney (US)', ['US']],
    ['AfterQuery', 'Content Writer & AI Evaluation Specialist (UK/US)', ['GB', 'US']],
  ];

  for (const [company, title, countries] of roles) {
    assert.equal(find(company, title).country_mode, 'allow', `${title} should be country-limited`);
    assert.deepEqual(find(company, title).countries, countries);
  }
});
