const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function build({ translation, book, chapter, verse }) {
  const customId = `context:${translation}:${book}:${chapter}:${verse}`;
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel('Context')
    .setStyle(ButtonStyle.Secondary);
  return [new ActionRowBuilder().addComponents(button)];
}

module.exports = { build };
