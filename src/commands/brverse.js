const { SlashCommandBuilder } = require('discord.js');
const { nameToId, idToName } = require('../lib/books');
const openReadingAdapter = require('../utils/openReadingAdapter');
const contextRow = require('../ui/contextRow');
const { ephemeral } = require('../utils/ephemeral');

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


    let bookId = Number(bookArg);
    if (Number.isNaN(bookId)) {
      bookId = nameToId(bookArg);
    }
    if (!bookId) {
      await interaction.reply(ephemeral({ content: 'Unknown book.' }));
      return;
    }

    let adapter;
    let translation;
    try {
      ({ adapter, translation } = await openReadingAdapter(interaction));
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
};
