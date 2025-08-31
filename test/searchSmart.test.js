const test = require('node:test');
const assert = require('node:assert/strict');
const searchSmart = require('../src/search/searchSmart');
const { createAdapter } = require('../src/db/translations');
const { nameToId } = require('../src/lib/books');

test('searchSmart handles non-contiguous verse lists', async () => {
  const adapter = await createAdapter('kjv');
  const john = nameToId('John');
  const results = await searchSmart(adapter, 'John 3:16,18');
  assert.deepEqual(results.map(r => r.verse), [16, 18]);
  assert.ok(results.every(r => r.book === john && r.chapter === 3));
  adapter.close();
});
