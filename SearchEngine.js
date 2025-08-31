const { createAdapter } = require('./src/db/translations');

async function search(query, translation = 'asvs', limit = 10) {
  const adapter = await createAdapter(translation);
  try {
    return await adapter.search(query, limit);
  } finally {
    if (adapter && adapter.close) adapter.close();
  }
}

module.exports = search;
