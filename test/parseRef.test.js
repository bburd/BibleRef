const test = require('node:test');
const assert = require('node:assert/strict');
const { expandVerses, parseRefString, toReading } = require('../src/lib/parseRef');

// Tests for expandVerses

test('expandVerses expands ranges and removes duplicates', () => {
  assert.deepEqual(expandVerses('1-3,5,7-8,2'), [1,2,3,5,7,8]);
});

test('expandVerses returns null on invalid range', () => {
  assert.equal(expandVerses('5-3'), null);
});

// Tests for parseRefString

test('parseRefString parses multi-chapter references', () => {
  assert.deepEqual(parseRefString('John 3:16-18,20;4:1-2'), {
    book: 43,
    ranges: [
      { chapter: 3, verses: [16,17,18,20] },
      { chapter: 4, verses: [1,2] },
    ],
  });
});

test('parseRefString handles chapter ranges', () => {
  assert.deepEqual(parseRefString('Genesis 1-3'), {
    book: 1,
    ranges: [{ chapter:1 }, { chapter:2 }, { chapter:3 }],
  });
});

test('parseRefString returns null for invalid book', () => {
  assert.equal(parseRefString('Notabook 1'), null);
});

// Tests for toReading

test('toReading parses string input', () => {
  assert.deepEqual(toReading('John 3:16-17'), {
    book: 43,
    ranges: [{ chapter:3, verses:[16,17] }],
  });
});

test('toReading parses object input', () => {
  assert.deepEqual(toReading({ book:'John', chapter:3, verses:'16-17' }), {
    book: 43,
    ranges: [{ chapter:3, verses:[16,17] }],
  });
});

test('toReading returns null for invalid input', () => {
  assert.equal(toReading({ book:'Unknown', chapter:1 }), null);
});

