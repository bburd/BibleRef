const { searchBooks } = require('../lib/books');
const openReadingAdapter = require('../utils/openReadingAdapter');

async function getMaxChapter(adapter, bookId) {
  const c = adapter._cols;
  const sql = `SELECT MAX(${c.chapter}) AS max FROM verses WHERE ${c.book}=?`;
  return new Promise((resolve, reject) => {
    adapter._db.get(sql, [bookId], (err, row) => {
      if (err) reject(err);
      else resolve(row?.max || 0);
    });
  });
}

async function getMaxVerse(adapter, bookId, chapter) {
  const c = adapter._cols;
  const sql = `SELECT MAX(${c.verse}) AS max FROM verses WHERE ${c.book}=? AND ${c.chapter}=?`;
  return new Promise((resolve, reject) => {
    adapter._db.get(sql, [bookId, chapter], (err, row) => {
      if (err) reject(err);
      else resolve(row?.max || 0);
    });
  });
}

module.exports = async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  const value = focused.value;

  if (focused.name === 'book') {
    const choices = searchBooks(value).map(({ id, name }) => ({
      name,
      value: String(id),
    }));
    await interaction.respond(choices.slice(0, 25));
    return;
  }

  let adapter;
  try {
    const bookVal = interaction.options.get('book')?.value;
    const chapterVal = interaction.options.get('chapter')?.value;

    if (focused.name === 'chapter') {
      const bookId = Number(bookVal);
      if (!bookId) return interaction.respond([]);

      ({ adapter } = await openReadingAdapter(interaction));

      const max = await getMaxChapter(adapter, bookId);
      const num = parseInt(value, 10);
      const start = Number.isNaN(num) || num < 1 ? 1 : num;
      const options = [];
      for (let n = start; n <= max && options.length < 25; n++) {
        options.push({ name: String(n), value: n });
      }
      await interaction.respond(options);
    } else if (focused.name === 'verse') {
      const bookId = Number(bookVal);
      const chapter = Number(chapterVal);
      if (!bookId || !chapter) return interaction.respond([]);

      ({ adapter } = await openReadingAdapter(interaction));

      const max = await getMaxVerse(adapter, bookId, chapter);
      const num = parseInt(value, 10);
      const start = Number.isNaN(num) || num < 1 ? 1 : num;
      const options = [];
      for (let n = start; n <= max && options.length < 25; n++) {
        options.push({ name: String(n), value: n });
      }
      await interaction.respond(options);
    } else {
      await interaction.respond([]);
    }
  } catch (err) {
    console.error('Autocomplete error:', err);
    try {
      await interaction.respond([]);
    } catch (e) {
      console.error('Failed to respond to autocomplete error:', e);
    }
  } finally {
    if (adapter && adapter.close) adapter.close();
  }
};
