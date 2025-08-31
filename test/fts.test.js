const test = require('node:test');
const assert = require('node:assert/strict');
const { ftsSafeQuery } = require('../src/utils/fts');

test('wraps tokens containing special characters', () => {
  assert.equal(ftsSafeQuery('jesus* love'), '"jesus*" love');
});

test('wraps reserved keywords', () => {
  assert.equal(ftsSafeQuery('love AND faith'), 'love "AND" faith');
});

test('escapes quotes inside tokens', () => {
  assert.equal(ftsSafeQuery('he"s'), '"he""s"');
});
