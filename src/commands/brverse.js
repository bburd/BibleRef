const { SlashCommandBuilder } = require('@discordjs/builders');
const { nameToId, idToName } = require('../lib/books');
const { createAdapter } = require('../db/translations');
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
    )
    .addIntegerOption(option =>
      option
        .setName('chapter')
        .setDescription('Chapter number')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('verse')
        .setDescription('Verse number')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('translation')
        .setDescription('Bible translation')
        .addChoices(
          { name: 'ASV', value: 'asvs' },
          { name: 'KJV Strongs', value: 'kjv_strongs' }
        )
    ),

  async execute(interaction) {
    const bookInput = interaction.options.getString('book');
    const chapter = interaction.options.getInteger('chapter');
    const verseNum = interaction.options.getInteger('verse');
    let translation = interaction.options.getString('translation');

    if (!translation) {
      translation = (await getUserTranslation(interaction.user.id)) || 'asvs';
    }

    const bookId = nameToId(bookInput);
    if (!bookId) {
      await interaction.reply('Unknown book.');
      return;
    }

    let adapter;
    try {
      adapter = await createAdapter(translation);
      const result = await adapter.getVerse(bookId, chapter, verseNum);
      if (!result) {
        await interaction.reply('Verse not found.');
      } else {
        const bookName = idToName(result.book);
        const message = `${bookName} ${result.chapter}:${result.verse} - ${result.text}`;
        await interaction.reply(message);
      }
    } catch (err) {
      console.error('Error fetching verse:', err);
      await interaction.reply('There was an error fetching the verse.');
    } finally {
      if (adapter && adapter.close) adapter.close();
    }
  },
};
