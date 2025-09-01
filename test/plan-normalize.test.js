const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDays, formatReading, formatDay } = require('../src/lib/plan-normalize');

// Test normalization for simple string days
const days1 = normalizeDays(['Genesis 1']);
test('normalizeDays handles string input', () => {
  assert.deepEqual(days1, [
    { readings: [{ book:1, ranges:[{ chapter:1 }] }] }
  ]);
});

// Test normalization for array of readings
const days2 = normalizeDays([[ 'Genesis 1', 'Exodus 2' ]]);
test('normalizeDays handles array of readings', () => {
  assert.deepEqual(days2, [
    { readings: [
      { book:1, ranges:[{ chapter:1 }] },
      { book:2, ranges:[{ chapter:2 }] }
    ] }
  ]);
});

// Test structured object with metadata and day-level _meta
const days3 = normalizeDays([
  {
    readings: [
      { ref: 'John 3:16', title: 'Memory', note: 'For God so loved', translation: 'NIV' },
      'Genesis 1'
    ],
    _meta: { mood: 'happy' }
  }
]);

test('normalizeDays preserves metadata and day-level _meta', () => {
  assert.deepEqual(days3, [
    {
      readings: [
        { book:43, ranges:[{ chapter:3, verses:[16] }], title:'Memory', note:'For God so loved', translation:'NIV' },
        { book:1, ranges:[{ chapter:1 }] }
      ],
      _meta: { mood: 'happy' }
    }
  ]);
});

// Test formatting utilities
const formattedReading = formatReading({ book:43, ranges:[{ chapter:3, verses:[1,2,3,5,7,8] }] });

test('formatReading compacts verse ranges', () => {
  assert.equal(formattedReading, 'John 3:1-3,5,7-8');
});

const dayForFormat = { readings: [
  { book:43, ranges:[{ chapter:3, verses:[16,17] }] },
  { book:1, ranges:[{ chapter:1 }] }
] };

test('formatDay bulletizes readings', () => {
  assert.equal(formatDay(dayForFormat), '• John 3:16-17\n• Genesis 1');
});
