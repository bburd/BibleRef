const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('brsearch text paginates long results', async () => {
  const searchPath = path.resolve(__dirname, '../src/search/searchSmart.js');
  const openPath = path.resolve(__dirname, '../src/utils/openReadingAdapter.js');

  const longText = 'x'.repeat(500);
  const fakeResults = Array.from({ length: 10 }, (_, i) => ({
    book: 1,
    chapter: 1,
    verse: i + 1,
    text: longText,
  }));

  require.cache[searchPath] = { exports: async () => fakeResults };
  require.cache[openPath] = {
    exports: async () => ({ adapter: { close() {} }, translation: 'asv' }),
  };

  delete require.cache[require.resolve('../commands/brsearch.js')];
  const brsearch = require('../commands/brsearch.js');

  let reply = {};
  const interaction = {
    options: {
      getSubcommand: () => 'text',
      getString: (name) =>
        name === 'query' ? 'dummy' : name === 'translation' ? 'asv' : null,
    },
    user: { id: 'user' },
    deferReply: () => Promise.resolve(),
    editReply: (msg) => {
      reply = msg;
      return Promise.resolve();
    },
  };

  await brsearch.execute(interaction);

  const desc = reply.embeds[0]?.data?.description || '';
  assert.ok(desc.length <= 4096);
  assert.ok(reply.components.length > 0);
});

test('brsearch topic groups results by book', async () => {
  const searchPath = path.resolve(__dirname, '../src/search/searchSmart.js');
  const openPath = path.resolve(__dirname, '../src/utils/openReadingAdapter.js');

  const fakeResults = [
    { book: 1, chapter: 1, verse: 1, text: 'a' },
    { book: 1, chapter: 1, verse: 2, text: 'b' },
    { book: 2, chapter: 1, verse: 1, text: 'c' },
  ];

  require.cache[searchPath] = { exports: async () => fakeResults };
  require.cache[openPath] = {
    exports: async () => ({ adapter: { close() {} }, translation: 'asv' }),
  };

  delete require.cache[require.resolve('../commands/brsearch.js')];
  const brsearch = require('../commands/brsearch.js');

  let reply = {};
  const interaction = {
    options: {
      getSubcommand: () => 'topic',
      getString: (name) =>
        name === 'query' ? 'dummy' : name === 'translation' ? 'asv' : null,
    },
    user: { id: 'user' },
    deferReply: () => Promise.resolve(),
    editReply: (msg) => {
      reply = msg;
      return Promise.resolve();
    },
  };

  await brsearch.execute(interaction);

  const desc = reply.embeds[0]?.data?.description || '';
  assert.ok(/Genesis/.test(desc));
  assert.ok(/Exodus/.test(desc));
});

