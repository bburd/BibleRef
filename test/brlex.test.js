const test = require('node:test');
const assert = require('node:assert/strict');
const { findVersesByStrong } = require('../src/commands/brlex');

const STRONG = 'G3056';

// Use small page size to test pagination easily
const PAGE_SIZE = 2;

test('findVersesByStrong finds verses for Greek code', async () => {
  const verses = await findVersesByStrong('kjv_strongs', STRONG, 0, PAGE_SIZE);
  assert.ok(verses.length > 0);
  const first = verses[0];
  assert.equal(first.book, 40); // Matthew
});

test('findVersesByStrong paginates results', async () => {
  const first = await findVersesByStrong('kjv_strongs', STRONG, 0, PAGE_SIZE);
  const second = await findVersesByStrong('kjv_strongs', STRONG, 1, PAGE_SIZE);
  assert.ok(second.length > 0);
  // Ensure at least one verse differs between pages
  assert.notEqual(first[0].verse, second[0].verse);
});

