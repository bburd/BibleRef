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

      const lines = results.map(
        (r) => `${idToName(r.book)} ${r.chapter}:${r.verse} - ${r.snippet || r.text}`
      );

      const limit = 2000;
      const marker = '[results truncated]';
      const buffer = [];
      let currentLength = 0;
      let truncated = false;
      for (const line of lines) {
        const addition = (buffer.length ? 1 : 0) + line.length;
        if (currentLength + addition > limit) {
          truncated = true;
          break;
        }
        buffer.push(line);
        currentLength += addition;
      }

      let output = buffer.join('\n');
      if (truncated) {
        const markerAddition = (output.length ? 1 : 0) + marker.length;
        while (output.length + markerAddition > limit && buffer.length) {
          buffer.pop();
          output = buffer.join('\n');
        }
        if (output.length) output += '\n';
        output += marker;
      }

      await interaction.editReply(output);
    } catch (err) {
      console.error('Error performing search:', err);
      await interaction.editReply('There was an error executing this command.');
    }
  },
};
