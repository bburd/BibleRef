const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function pack(data) {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64');
}

function unpack(payload) {
  try {
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function build({ translation, book, chapter, verse }) {
  const payload = pack({ translation, book, chapter, verse });
  const more = new ButtonBuilder()
    .setCustomId(`ctx:more:${payload}`)
    .setLabel('More')
    .setStyle(ButtonStyle.Secondary);
  const orig = new ButtonBuilder()
    .setCustomId(`ctx:orig:${payload}`)
    .setLabel("Original")
    .setStyle(ButtonStyle.Secondary);
  const xref = new ButtonBuilder()
    .setCustomId(`ctx:xref:${payload}`)
    .setLabel('Cross Ref')
    .setStyle(ButtonStyle.Secondary);
  return [new ActionRowBuilder().addComponents(more, orig, xref)];
}

module.exports = { build, pack, unpack };

