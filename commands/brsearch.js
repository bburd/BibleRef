const { SlashCommandBuilder } = require('@discordjs/builders');
const { idToName } = require('../src/lib/books');
const { getUserTranslation } = require('../src/db/users');
const search = require('../SearchEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brsearch')
    .setDescription('Search Bible verses')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Search query')
        .setRequired(true)
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
    const query = interaction.options.getString('query');
    let translation = interaction.options.getString('translation');
    if (!translation) {
      translation = (await getUserTranslation(interaction.user.id)) || 'asv';
    }

    await interaction.deferReply();
    try {
      const results = await search(query, translation, 10);
      if (!results.length) {
        await interaction.editReply('No results found.');
        return;
      }
      const lines = results.map(r => `${idToName(r.book)} ${r.chapter}:${r.verse} - ${r.snippet || r.text}`);
      await interaction.editReply(lines.join('\n'));
    } catch (err) {
      console.error('Error performing search:', err);
      await interaction.editReply('There was an error executing this command.');
    }
  },
};
