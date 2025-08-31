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
