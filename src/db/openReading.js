const { createAdapter } = require('./translations');

const STRONGS_FALLBACK = {
  kjv: 'kjv_strongs',
  asv: 'asvs',
};

function stripStrongs(text) {
  return text ? text.replace(/<[GH]\d+>/gi, '') : text;
}

async function openReading(translation = 'asv', options = {}) {
  try {
    return await createAdapter(translation, options);
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
      close: () => adapter.close(),
    };
  }
}

module.exports = { openReading };
