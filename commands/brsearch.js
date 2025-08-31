const { SlashCommandBuilder } = require('@discordjs/builders');
const { idToName } = require('../src/lib/books');
const openReadingAdapter = require('../src/utils/openReadingAdapter');
const searchSmart = require('../src/search/searchSmart');
const { parseRef } = require('../src/utils/refs');

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
    const ref = parseRef(query);
    const isRange =
      ref && Array.isArray(ref.verses) && ref.verses.length > 1 && query.includes('-');
    await interaction.deferReply();
    let adapter;
    try {
      ({ adapter } = await openReadingAdapter(interaction));
      const results = await searchSmart(adapter, query, 10);
      if (!results.length) {
        if (isRange) {
          await interaction.editReply("That verse range doesn’t exist in this chapter.");
        } else {
          await interaction.editReply('No results found.');
        }
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
    } finally {
      if (adapter && adapter.close) adapter.close();
    }
  },
};
