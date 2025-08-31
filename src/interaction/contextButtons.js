const { openReadingAdapter } = require('../db/openReading');
const { createAdapter } = require('../db/translations');
const { idToName } = require('../lib/books');
const { unpack } = require('../ui/contextRow');

const STRONGS_TRANSLATIONS = {
  kjv: 'kjv_strongs',
  asv: 'asvs',
  kjv_strongs: 'kjv_strongs',
  asvs: 'asvs',
};

async function findXrefs(adapter, strongs, exclude) {
  const c = adapter._cols;

  function all(sql, params) {
    return new Promise((resolve, reject) => {
      adapter._db.all(sql, params, (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    });
  }

  const counts = new Map();
  for (const strong of strongs) {
    const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse FROM verses WHERE ${c.text} LIKE ?`;
    const rows = await all(sql, [`%<${strong}>%`]);
    for (const r of rows) {
      if (r.book === exclude.book && r.chapter === exclude.chapter && r.verse === exclude.verse) continue;
      const key = `${r.book}:${r.chapter}:${r.verse}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { ...r, count: 1 });
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

module.exports = async function handleContextButtons(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('ctx:')) return false;

  const [, action, payload] = id.split(':');
  const data = unpack(payload);
  if (!data) return false;

  const { translation, book, chapter, verse } = data;

  try {
    if (action === 'more') {
      const adapter = await openReadingAdapter(translation);
      const verses = [verse - 1, verse, verse + 1].filter((v) => v > 0);
      const rows = await adapter.getVersesSubset(book, chapter, verses);
      adapter.close();
      if (!rows.length) {
        await interaction.reply({ content: 'No additional context available.', ephemeral: true });
        return true;
      }
      const bookName = idToName(book);
      const msg = rows
        .map((r) => `${r.verse}. ${r.text}`)
        .join('\n');
      await interaction.reply({ content: `${bookName} ${chapter}\n${msg}`, ephemeral: true });
      return true;
    }

    if (action === 'orig' || action === 'xref') {
      const strongsTrans = STRONGS_TRANSLATIONS[translation] || translation;
      const adapter = await createAdapter(strongsTrans);
      const row = await adapter.getVerse(book, chapter, verse);
      if (!row) {
        adapter.close();
        await interaction.reply({ content: 'Verse not found.', ephemeral: true });
        return true;
      }

      if (action === 'orig') {
        const bookName = idToName(book);
        await interaction.reply({
          content: `${bookName} ${chapter}:${verse} - ${row.text}`,
          ephemeral: true,
        });
        adapter.close();
        return true;
      }

      // xref
      const matches = row.text.match(/<[GH]\d+>/gi) || [];
      let xrefs = [];
      if (matches.length) {
        const strongs = Array.from(new Set(matches.map((m) => m.slice(1, -1))));
        const refs = await findXrefs(adapter, strongs, { book, chapter, verse });
        xrefs = refs
          .slice(0, 5)
          .map((r) => `${idToName(r.book)} ${r.chapter}:${r.verse}`);
      } else {
        // Fallback to simple text search when strong's tokens are unavailable
        const cleaned = row.text.replace(/<[^>]+>/g, '').split(/\s+/).slice(0, 3).join(' ');
        const results = await adapter.search(cleaned, 5);
        xrefs = results
          .filter(
            (r) => !(r.book === book && r.chapter === chapter && r.verse === verse)
          )
          .map((r) => `${idToName(r.book)} ${r.chapter}:${r.verse}`);
      }
      adapter.close();
      if (!xrefs.length) {
        await interaction.reply({ content: 'No cross references found.', ephemeral: true });
      } else {
        await interaction.reply({
          content: `Cross references: ${xrefs.join(', ')}`,
          ephemeral: true,
        });
      }
      return true;
    }
  } catch (err) {
    console.error('Error handling context button:', err);
    if (!interaction.replied) {
      try {
        await interaction.reply({ content: 'Error processing request.', ephemeral: true });
      } catch (e) {
        console.error('Failed to reply to interaction:', e);
      }
    }
    return true;
  }

  return false;
};

