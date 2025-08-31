const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdapter } = require('../src/db/translations');
const { nameToId } = require('../src/lib/books');

test('getVerse retrieves verse', async () => {
  const db = await createAdapter('kjv_strongs');
  const john = nameToId('John');
  const verse = await db.getVerse(john, 3, 16);
  assert.ok(verse && verse.text.includes('God'));
  db.close();
});

test('search finds verse', async () => {
  const db = await createAdapter('kjv_strongs');
  const results = await db.search('only begotten', 10);
  const john = nameToId('John');
  assert.ok(results.some(r => r.book === john && r.chapter === 3 && r.verse === 16));
  db.close();
});

test('random search returns a verse', async () => {
  const db = await createAdapter('kjv_strongs');
  const results = await db.search('random', 1);
  assert.equal(results.length, 1);
  assert.ok(results[0].text && results[0].book);
  db.close();
});
