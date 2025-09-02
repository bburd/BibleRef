const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDayWithText } = require('../src/lib/plan-format-text');

test('formatDayWithText expands verses and renders metadata', async () => {
  const day = {
    readings: [
      { book: 43, ranges: [{ chapter: 3, verses: [16, 17] }] },
    ],
    _meta: { note: 'Day note', prayer: 'Day prayer' },
  };
  const out = await formatDayWithText(day, 'asv');
  assert.match(out, /• John 3:16–17/);
  assert.match(out, /16\. For God so loved the world/);
  assert.match(out, /17\. For God sent not the Son into the world/);
  assert.match(out, /Note: Day note/);
  assert.match(out, /Prayer: Day prayer/);
});
