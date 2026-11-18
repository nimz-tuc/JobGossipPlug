const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, sortForUser } = require('../lib/match');

test('students get eligible starter roles without seeing skilled listings', () => {
  const listings = [
    { id: 1, title: 'Flexible task', min_level: 'entry', country_mode: 'all', countries: [], fields: [], sort_order: 1 },
    { id: 2, title: 'Expert role', min_level: 'skilled', country_mode: 'all', countries: [], fields: [], sort_order: 2 },
  ];

  const { eligible, unavailable } = sortForUser(listings, { level: 'student', country: 'KE', fields: [] });

  assert.deepEqual(eligible.map(o => o.id), [1]);
  assert.deepEqual(unavailable, []);
});

test('country allow-lists exclude roles unavailable in the visitor country', () => {
  const role = { min_level: 'entry', country_mode: 'allow', countries: ['US'] };

  assert.deepEqual(evaluate(role, { level: 'student', country: 'KE' }), { ok: false, reason: 'country' });
  assert.deepEqual(evaluate(role, { level: 'student', country: 'US' }), { ok: true });

  const { eligible, unavailable } = sortForUser(
    [{ ...role, id: 1, fields: [], sort_order: 1 }],
    { level: 'student', country: 'KE', fields: [] },
  );
  assert.deepEqual(eligible, []);
  assert.deepEqual(unavailable, []);
});
