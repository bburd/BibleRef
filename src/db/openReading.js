const { createAdapter } = require('./translations');
const { stripStrongs } = require('./strongs');

const STRONGS_FALLBACK = {
  kjv: 'kjv_strongs',
  asv: 'asvs',
};

async function openReading(translation = 'asv', options = {}) {
  try {
    const adapter = await createAdapter(translation, options);
    return adapter;
  } catch (err) {
    const strongs = STRONGS_FALLBACK[translation];
    if (!strongs) throw err;
    const adapter = await createAdapter(strongs, options);
    return {
      getVerse: async (book, chapter, verse) => {
        const row = await adapter.getVerse(book, chapter, verse);
        if (row) row.text = stripStrongs(row.text);
        return row;
      },
      getChapter: async (book, chapter) => {
        const rows = await adapter.getChapter(book, chapter);
        return rows.map((r) => ({ ...r, text: stripStrongs(r.text) }));
      },
      getVersesSubset: async (book, chapter, verses) => {
        const rows = await adapter.getVersesSubset(book, chapter, verses);
        return rows.map((r) => ({ ...r, text: stripStrongs(r.text) }));
      },
      search: async (q, limit) => {
        const rows = await adapter.search(q, limit);
        return rows.map((r) => {
          if (r.snippet) return { ...r, snippet: stripStrongs(r.snippet) };
          if (r.text) return { ...r, text: stripStrongs(r.text) };
          return r;
        });
      },
      getRandom: async () => {
        const row = await adapter.getRandom();
        return row ? { ...row, text: stripStrongs(row.text) } : null;
      },
      close: () => adapter.close(),
      _db: adapter._db,
      _cols: adapter._cols,
    };
  }
}

async function openReadingAdapter(preferred = 'asv', options = {}) {
  try {
    return await openReading(preferred, options);
  } catch (err) {
    const fallback = preferred === 'kjv' ? 'asv' : 'kjv';
    return await openReading(fallback, options);
  }
}

module.exports = { openReading, openReadingAdapter };
