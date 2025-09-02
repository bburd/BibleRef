const test = require('node:test');
const assert = require('node:assert/strict');
const { openReading } = require('../src/db/openReading');

// ensure repeated open/close of reading adapter works without closed db errors

test('openReading returns fresh connection after close', async () => {
  for (let i = 0; i < 2; i++) {
    const adapter = await openReading('asv');
    assert.ok(adapter._db.filename.endsWith('asv.sqlite'));
    const verse = await adapter.getRandom();
    assert.ok(verse && verse.text);
    adapter.close();
  }
});

