const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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

async function findVersesByStrong(strong, page = 0, pageSize = PAGE_SIZE, translation) {
  async function query(t) {
    const adapter = await createAdapter(t);
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

  let chosenTranslation = translation || 'kjv_strongs';
  let rows = await query(chosenTranslation);
  if (!rows.length && !translation) {
    chosenTranslation = 'asvs';
    rows = await query(chosenTranslation);
  }
  return { rows, translation: chosenTranslation };
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

function searchDict(query, page = 0, pageSize = PAGE_SIZE) {
  const q = query.toLowerCase();
  const matches = Object.entries(strongsDict)
    .filter(([id, e]) => {
      return (
        id.toLowerCase().includes(q) ||
        (e.lemma && e.lemma.toLowerCase().includes(q)) ||
        (e.translit && e.translit.toLowerCase().includes(q)) ||
        (e.gloss && e.gloss.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => a[0].localeCompare(b[0]));
  const start = page * pageSize;
  const results = matches.slice(start, start + pageSize + 1);
  return { results, total: matches.length };
}

function searchEmbed(query, results, page) {
  const embed = new EmbedBuilder().setTitle(`Search: ${query}`);
  if (results.length === 0) {
    embed.setDescription('No matches found.');
    return embed;
  }
  results.slice(0, PAGE_SIZE).forEach(([id, e]) => {
    const parts = [];
    if (e.lemma) parts.push(e.lemma);
    if (e.translit) parts.push(e.translit);
    if (e.gloss) parts.push(e.gloss);
    embed.addFields({ name: id, value: parts.join(' — ') || ' ' });
  });
  embed.setFooter({ text: `Page ${page + 1}` });
  return embed;
}

async function commandExecute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'id') {
    const strong = (interaction.options.getString('value') || '').toUpperCase();
    const entry = strongsDict[strong];
    const { rows, translation } = await findVersesByStrong(strong, 0, PAGE_SIZE);
    const embed = lexEmbed(strong, entry, rows, 0);
    const components = [];
    if (rows.length > PAGE_SIZE) {
      const payload = encode({ type: 'id', strong, translation, page: 0 });
      const next = new ButtonBuilder()
        .setCustomId(`brlex:next:${payload}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary);
      components.push(new ActionRowBuilder().addComponents(next));
    }
    await interaction.reply({ embeds: [embed], components });
  } else if (sub === 'search') {
    const query = interaction.options.getString('query') || '';
    const { results } = searchDict(query, 0, PAGE_SIZE);
    const embed = searchEmbed(query, results, 0);
    const components = [];
    if (results.length > PAGE_SIZE) {
      const payload = encode({ type: 'search', query, page: 0 });
      const next = new ButtonBuilder()
        .setCustomId(`brlex:next:${payload}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary);
      components.push(new ActionRowBuilder().addComponents(next));
    }
    await interaction.reply({ embeds: [embed], components });
  }
}

async function handleButtons(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('brlex:')) return false;
  const [, action, payload] = id.split(':');
  const data = decode(payload);
  if (!data) return false;
  let { type, page } = data;
  if (action === 'next') page += 1;
  else if (action === 'prev') page -= 1;
  if (page < 0) page = 0;
  if (type === 'search') {
    const { results } = searchDict(data.query, page, PAGE_SIZE);
    const embed = searchEmbed(data.query, results, page);
    const buttons = [];
    if (page > 0) {
      const prevPayload = encode({ type: 'search', query: data.query, page: page - 1 });
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`brlex:prev:${prevPayload}`)
          .setLabel('Prev')
          .setStyle(ButtonStyle.Secondary)
      );
    }
    if (results.length > PAGE_SIZE) {
      const nextPayload = encode({ type: 'search', query: data.query, page: page + 1 });
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
  if (type === 'id') {
    const { rows } = await findVersesByStrong(
      data.strong,
      page,
      PAGE_SIZE,
      data.translation
    );
    const entry = strongsDict[data.strong];
    const embed = lexEmbed(data.strong, entry, rows, page);
    const buttons = [];
    if (page > 0) {
      const prevPayload = encode({
        type: 'id',
        strong: data.strong,
        translation: data.translation,
        page: page - 1,
      });
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`brlex:prev:${prevPayload}`)
          .setLabel('Prev')
          .setStyle(ButtonStyle.Secondary)
      );
    }
    if (rows.length > PAGE_SIZE) {
      const nextPayload = encode({
        type: 'id',
        strong: data.strong,
        translation: data.translation,
        page: page + 1,
      });
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`brlex:next:${nextPayload}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
      );
    }
    const components = buttons.length
      ? [new ActionRowBuilder().addComponents(buttons)]
      : [];
    await interaction.update({ embeds: [embed], components });
    return true;
  }
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brlex')
    .setDescription("Look up Strong's entries and related verses")
    .addSubcommand((sub) =>
      sub
        .setName('id')
        .setDescription("Lookup Strong's entry by number")
        .addStringOption((opt) =>
          opt
            .setName('value')
            .setDescription("Strong's number, e.g., G3056")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('search')
        .setDescription("Search Strong's dictionary")
        .addStringOption((opt) =>
          opt.setName('query').setDescription('Search term').setRequired(true)
        )
    ),
  execute: commandExecute,
  handleButtons,
  findVersesByStrong,
  lexEmbed,
};

