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

async function findXrefs(adapter, strong, exclude) {
  const c = adapter._cols;
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse FROM verses WHERE ${c.text} LIKE ? LIMIT 5`;
  return new Promise((resolve, reject) => {
    adapter._db.all(sql, [`%<${strong}>%`], (err, rows) => {
      if (err) return reject(err);
      const refs = rows.filter(
        (r) => !(r.book === exclude.book && r.chapter === exclude.chapter && r.verse === exclude.verse)
      );
      resolve(refs);
    });
  });
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
      const unique = Array.from(new Set(matches.map((m) => m.slice(1, -1))));
      const xrefs = [];
      for (const strong of unique) {
        const refs = await findXrefs(adapter, strong, { book, chapter, verse });
        for (const r of refs) {
          const refStr = `${idToName(r.book)} ${r.chapter}:${r.verse}`;
          if (!xrefs.includes(refStr)) xrefs.push(refStr);
          if (xrefs.length >= 5) break;
        }
        if (xrefs.length >= 5) break;
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

