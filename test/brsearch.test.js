const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('brsearch truncates long results with notice', async () => {
  const searchPath = path.resolve(__dirname, '../src/search/searchSmart.js');

  const longText = 'x'.repeat(500);
  const fakeResults = Array.from({ length: 10 }, (_, i) => ({
    book: 1,
    chapter: 1,
    verse: i + 1,
    text: longText,
  }));

  require.cache[searchPath] = {
    exports: async () => fakeResults,
  };

  const brsearch = require('../commands/brsearch.js');

  let reply = '';
  const interaction = {
    options: {
      getString: (name) => (name === 'query' ? 'dummy' : name === 'translation' ? 'asv' : null),
    },
    user: { id: 'user' },
    deferReply: () => Promise.resolve(),
    editReply: (msg) => {
      reply = msg;
      return Promise.resolve();
    },
  };

  await brsearch.execute(interaction);

  assert.ok(reply.endsWith('[results truncated]'));
  assert.ok(reply.length <= 2000);
});

