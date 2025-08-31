const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRef } = require('../src/utils/refs');

test('parses single verse', () => {
  assert.deepEqual(parseRef('John 3:16'), { book: 43, chapter: 3, verses: [16] });
});

test('parses verse ranges', () => {
  assert.deepEqual(parseRef('John 3:16-18'), { book: 43, chapter: 3, verses: [16, 17, 18] });
});

test('parses verse lists', () => {
  assert.deepEqual(parseRef('John 3:16,18,20'), { book: 43, chapter: 3, verses: [16, 18, 20] });
});

test('parses whole chapter', () => {
  assert.deepEqual(parseRef('John 3'), { book: 43, chapter: 3 });
});

test('handles numeric book ids', () => {
  assert.deepEqual(parseRef('43 3:16'), { book: 43, chapter: 3, verses: [16] });
});
