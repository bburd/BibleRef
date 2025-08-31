const { openReading } = require('./src/db/openReading');
const searchSmart = require('./src/search/searchSmart');

async function search(query, translation = 'asv', limit = 10) {
  const adapter = await openReading(translation);
  try {
    return await searchSmart(adapter, query, limit);
  } finally {
    if (adapter && adapter.close) adapter.close();
  }
}

module.exports = search;
