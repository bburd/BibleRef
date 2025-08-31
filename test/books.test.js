const test = require('node:test');
const assert = require('node:assert/strict');
const { idToName, nameToId } = require('../src/lib/books');

test('idToName basic mapping', () => {
  assert.equal(idToName(1), 'Genesis');
});

test('nameToId tolerant parsing', () => {
  assert.equal(nameToId('gen'), 1);
  assert.equal(nameToId('II Kings'), 12);
  assert.equal(nameToId('song of songs'), 22);
  assert.equal(nameToId('Revelations'), 66);
  assert.equal(nameToId('i john'), 62);
});

test('nameToId standard abbreviations', () => {
  const examples = {
    jn: 43,
    '1sa': 9,
    phlm: 57,
    rev: 66,
  };
  for (const [abbr, id] of Object.entries(examples)) {
    assert.equal(nameToId(abbr), id);
  }
});
