const { parseRef } = require('../utils/refs');
const { ftsSafeQuery } = require('../utils/fts');

/**
 * Perform a smart search over the scriptures. If the query is a reference,
 * verses are fetched directly using adapter helpers. Otherwise an FTS query
 * is executed through the adapter.
 *
 * @param {object} adapter Database adapter returned by createAdapter.
 * @param {string} rawQuery The user provided search string.
 * @param {number} [limit=10] Maximum number of results to return for text search.
 * @returns {Promise<Array>} Array of verse rows.
 */
async function searchSmart(adapter, rawQuery, limit = 10) {
  const query = String(rawQuery || '').trim();
  if (!query) return [];

  const ref = parseRef(query);
  if (ref) {
    const { book, chapter, verses } = ref;
    if (book && chapter) {
      if (Array.isArray(verses) && verses.length) {
        if (verses.length === 1) {
          const row = await adapter.getVerse(book, chapter, verses[0]);
          return row ? [row] : [];
        }
        const start = Math.min(...verses);
        const end = Math.max(...verses);
        const subset = await adapter.getVersesSubset(book, chapter, start, end);
        return subset.filter((r) => verses.includes(r.verse));
      }
      return adapter.getChapter(book, chapter);
    }
  }

  const safe = ftsSafeQuery(query);
  if (!safe) return [];
  return adapter.search(safe, limit);
}

module.exports = searchSmart;
