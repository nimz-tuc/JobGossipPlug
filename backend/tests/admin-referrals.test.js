const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReferralInput } = require('../routes/admin');

test('parses CSV rows with quoted titles containing commas', () => {
  const input = [
    '"AI/ML Engineer, Internal Platforms",https://example.com/first',
    '"Software Engineer (Staff), Platform Engineering",https://example.com/second',
  ].join('\n');

  assert.deepEqual(parseReferralInput(input), [
    { title: 'AI/ML Engineer, Internal Platforms', url: 'https://example.com/first' },
    { title: 'Software Engineer (Staff), Platform Engineering', url: 'https://example.com/second' },
  ]);
});

test('parses pipe and tab rows and ignores the CSV header', () => {
  const input = [
    'Role,Referral link',
    'Ophthalmologist | https://example.com/oph',
    'Radiologist\thttps://example.com/rad',
  ].join('\n');

  assert.deepEqual(parseReferralInput(input), [
    { title: 'Ophthalmologist', url: 'https://example.com/oph' },
    { title: 'Radiologist', url: 'https://example.com/rad' },
  ]);
});
