const { SlashCommandBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createAdapter } = require('../db/translations');
const { idToName } = require('../lib/books');
const strongsDict = require('../../db/strongs-dictionary.json');

const PAGE_SIZE = 5;

function encode(data) {
  return Buffer.from(JSON.stringify(data))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decode(str) {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

async function findVersesByStrong(translation, strong, page = 0, pageSize = PAGE_SIZE) {
  const adapter = await createAdapter(translation);
  const c = adapter._cols;
  const offset = page * pageSize;
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses WHERE ${c.text} LIKE ? ORDER BY ${c.book}, ${c.chapter}, ${c.verse} LIMIT ? OFFSET ?`;
  const pattern = `%{${strong}}%`;
  const rows = await new Promise((resolve, reject) => {
    adapter._db.all(sql, [pattern, pageSize + 1, offset], (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
  adapter.close();
  return rows;
}

function cleanText(text) {
  return text.replace(/\{[^}]+\}/g, '').trim();
}

function lexEmbed(strong, entry, verses, page) {
  const embed = new EmbedBuilder();
  embed.setTitle(strong);
  if (entry) {
    const parts = [];
    if (entry.lemma) parts.push(entry.lemma);
    if (entry.translit) parts.push(entry.translit);
    if (entry.gloss) parts.push(entry.gloss);
    embed.setDescription(parts.join(' — '));
  } else {
    embed.setDescription('No dictionary entry found.');
  }
  verses.slice(0, PAGE_SIZE).forEach((v) => {
    const ref = `${idToName(v.book)} ${v.chapter}:${v.verse}`;
    embed.addFields({ name: ref, value: cleanText(v.text) });
  });
  embed.setFooter({ text: `Page ${page + 1}` });
  return embed;
}

async function commandExecute(interaction) {
  const strong = (interaction.options.getString('strong') || '').toUpperCase();
  const translationOpt = interaction.options.getString('translation') || 'kjv';
  const translation = translationOpt === 'asv' ? 'asvs' : 'kjv_strongs';

  const entry = strongsDict[strong];
  const rows = await findVersesByStrong(translation, strong, 0, PAGE_SIZE);
  const embed = lexEmbed(strong, entry, rows, 0);
  const components = [];
  if (rows.length > PAGE_SIZE) {
    const payload = encode({ strong, translation, page: 0 });
    const next = new ButtonBuilder()
      .setCustomId(`brlex:next:${payload}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary);
    components.push(new ActionRowBuilder().addComponents(next));
  }
  await interaction.reply({ embeds: [embed], components });
}

async function handleButtons(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('brlex:')) return false;
  const [, action, payload] = id.split(':');
  const data = decode(payload);
  if (!data) return false;
  let { strong, translation, page } = data;
  const entry = strongsDict[strong];
  if (action === 'next') page += 1;
  else if (action === 'prev') page -= 1;
  if (page < 0) page = 0;
  const rows = await findVersesByStrong(translation, strong, page, PAGE_SIZE);
  const embed = lexEmbed(strong, entry, rows, page);
  const buttons = [];
  if (page > 0) {
    const prevPayload = encode({ strong, translation, page: page - 1 });
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`brlex:prev:${prevPayload}`)
        .setLabel('Prev')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  if (rows.length > PAGE_SIZE) {
    const nextPayload = encode({ strong, translation, page: page + 1 });
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`brlex:next:${nextPayload}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  const components = buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [];
  await interaction.update({ embeds: [embed], components });
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brlex')
    .setDescription("Look up Strong's entries and related verses")
    .addStringOption((opt) =>
      opt
        .setName('strong')
        .setDescription("Strong's number, e.g., G3056")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('translation')
        .setDescription('Bible translation')
        .addChoices(
          { name: 'ASV', value: 'asv' },
          { name: 'KJV', value: 'kjv' }
        )
    ),
  execute: commandExecute,
  handleButtons,
  findVersesByStrong,
  lexEmbed,
};

