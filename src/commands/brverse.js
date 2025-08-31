const { SlashCommandBuilder } = require('@discordjs/builders');
const { nameToId, idToName, searchBooks } = require('../lib/books');
const { openReadingAdapter } = require('../db/openReading');
const contextRow = require('../ui/contextRow');
const { getUserTranslation } = require('../db/users');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brverse')
    .setDescription('Fetch a verse from the Bible')
    .addStringOption(option =>
      option
        .setName('book')
        .setDescription('Book of the Bible')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('chapter')
        .setDescription('Chapter number')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('verse')
        .setDescription('Verse number')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('translation')
        .setDescription('Bible translation')
        .addChoices(
          { name: 'ASV', value: 'asv' },
          { name: 'KJV', value: 'kjv' }
        )
    ),

  async execute(interaction) {
    const bookArg = interaction.options.getString('book');
    const chapter = interaction.options.getInteger('chapter');
    const verseNum = interaction.options.getInteger('verse');
    let translation = interaction.options.getString('translation');

    if (!translation) {
      translation = (await getUserTranslation(interaction.user.id)) || 'asv';
    }

    let bookId = Number(bookArg);
    if (Number.isNaN(bookId)) {
      bookId = nameToId(bookArg);
    }
    if (!bookId) {
      await interaction.reply({ content: 'Unknown book.', ephemeral: true });
      return;
    }

    let adapter;
    try {
      adapter = await openReadingAdapter(translation);
      const result = await adapter.getVerse(bookId, chapter, verseNum);
      if (!result) {
        await interaction.reply('Verse not found.');
      } else {
        const bookName = idToName(result.book);
        const message = `${bookName} ${result.chapter}:${result.verse} - ${result.text}`;
        const components = contextRow.build({
          book: result.book,
          chapter: result.chapter,
          verse: result.verse,
          translation,
        });
        await interaction.reply({ content: message, components });
      }
    } catch (err) {
      console.error('Error fetching verse:', err);
      await interaction.reply('There was an error fetching the verse.');
    } finally {
      if (adapter && adapter.close) adapter.close();
    }
  },
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const value = focused.value;
    if (focused.name === 'book') {
      const choices = searchBooks(value).map(({ id, name }) => ({
        name,
        value: String(id),
      }));
      await interaction.respond(choices);
    } else if (focused.name === 'chapter' || focused.name === 'verse') {
      const num = parseInt(value, 10);
      const start = Number.isNaN(num) || num < 1 ? 1 : num;
      const options = Array.from({ length: 25 }, (_, i) => start + i).map((n) => ({
        name: String(n),
        value: n,
      }));
      await interaction.respond(options);
    } else {
      await interaction.respond([]);
    }
  },
};
