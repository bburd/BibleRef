const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { idToName } = require('../src/lib/books');
const { openReading } = require('../src/db/openReading');
const searchSmart = require('../src/search/searchSmart');
const { searchSessions } = require('../src/state/sessions');
const { clampLen } = require('../src/utils/validate');

const MAX_TEXT_RESULTS = 50;
const MAX_TOPIC_RESULTS = 200;

// msgId -> { type, query, translation, page, pageSize }

function buildButtons(hasPrev, hasNext) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('bs:p')
        .setLabel('Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasPrev),
      new ButtonBuilder()
        .setCustomId('bs:n')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasNext)
    ),
  ];
}

function linesFromGroups(results) {
  const groups = new Map();
  results.forEach((r) => {
    if (!groups.has(r.book)) groups.set(r.book, []);
    groups.get(r.book).push(r);
  });
  const clusters = Array.from(groups.entries()).map(([book, rows]) => {
    rows.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
    const samples = rows
      .slice(0, 3)
      .map((r) => `${r.chapter}:${r.verse}`)
      .join(', ');
    const sampleText = rows.length > 3 ? `${samples}…` : samples;
    return {
      book,
      count: rows.length,
      line: `${idToName(book)}: ${rows.length} hits (${sampleText})`,
    };
  });
  clusters.sort((a, b) => b.count - a.count);
  return clusters.map((c) => c.line);
}

function buildTopicEmbed(query, lines, page) {
  return new EmbedBuilder()
    .setTitle(`Topic: ${query}`)
    .setDescription(lines.join('\n').slice(0, 4096))
    .setFooter({ text: `Page ${page + 1}` });
}

async function runSearch({ type, query, translation, page, pageSize }) {
  const adapter = await openReading(translation);
  try {
    if (type === 'topic') {
      const results = await searchSmart(adapter, query, MAX_TOPIC_RESULTS);
      if (!results.length) return { items: [], hasNext: false };
      const lines = linesFromGroups(results);
      const start = page * pageSize;
      const items = lines.slice(start, start + pageSize);
      const hasNext = start + pageSize < lines.length;
      return { items, hasNext };
    } else {
      const results = await searchSmart(adapter, query, MAX_TEXT_RESULTS);
      if (!results.length) return { items: [], hasNext: false };
      const lines = results.map(
        (r) => `${idToName(r.book)} ${r.chapter}:${r.verse} - ${r.snippet || r.text}`
      );
      const start = page * pageSize;
      const items = lines.slice(start, start + pageSize);
      const hasNext = start + pageSize < lines.length;
      return { items, hasNext };
    }
  } finally {
    if (adapter && adapter.close) adapter.close();
  }
}

function renderItems(items) {
  return items.join('\n');
}

async function execute(interaction) {
  await interaction.deferReply();
  try {
    const type = interaction.options.getSubcommand();
    const query = clampLen(interaction.options.getString('query') || '');
    if (!query.trim()) {
      await interaction.editReply({ content: 'Query cannot be empty.', components: [] });
      return;
    }
    const translation = (interaction.options.getString('translation') || 'asv').toLowerCase();
    const pageSize = 10;
    const page = 0;

    const { items, hasNext } = await runSearch({
      type,
      query,
      translation,
      page,
      pageSize,
    });

    if (!items.length) {
      await interaction.editReply({ content: 'No results found.', components: [] });
      return;
    }

    let embed;
    if (type === 'topic') {
      embed = buildTopicEmbed(query, items, page);
    } else {
      const desc = renderItems(items).slice(0, 4096);
      embed = new EmbedBuilder()
        .setTitle(`Search: ${query}`)
        .setDescription(desc)
        .setFooter({ text: `Page ${page + 1}` });
    }

    const components = buildButtons(false, hasNext);
    const sent = await interaction.editReply({
      content: null,
      embeds: [embed],
      components,
      fetchReply: true,
    });

    if (sent && sent.id) {
      searchSessions.set(sent.id, { type, query, translation, page, pageSize });
    }
  } catch (err) {
    console.error('Error executing brsearch command:', err);
    await interaction.editReply('An error occurred while executing this command.');
  }
}

module.exports.handleButtons = async function handleSearchButtons(interaction) {
  if (!interaction.isButton()) return false;
  const id = interaction.customId;
  if (id !== 'bs:p' && id !== 'bs:n') return false;

  const msgId = interaction.message?.id;
  const sess = msgId && searchSessions.get(msgId);
  if (!sess) {
    await interaction.reply({ content: 'This search session expired.', flags: 64 });
    return true;
  }

  if (id === 'bs:n') sess.page += 1;
  if (id === 'bs:p') sess.page = Math.max(0, sess.page - 1);

  const { items, hasNext } = await runSearch({
    type: sess.type,
    query: sess.query,
    translation: sess.translation,
    page: sess.page,
    pageSize: sess.pageSize,
  });

  let embed;
  if (sess.type === 'topic') {
    embed = buildTopicEmbed(sess.query, items, sess.page);
  } else {
    const desc = renderItems(items).slice(0, 4096);
    embed = new EmbedBuilder()
      .setTitle(`Search: ${sess.query}`)
      .setDescription(desc)
      .setFooter({ text: `Page ${sess.page + 1}` });
  }

  const hasPrev = sess.page > 0;
  const components = buildButtons(hasPrev, hasNext);
  await interaction.update({
    content: null,
    embeds: [embed],
    components,
  });

  return true;
};

module.exports.data = new SlashCommandBuilder()
  .setName('brsearch')
  .setDescription('Search Bible verses')
  .addSubcommand((sub) =>
    sub
      .setName('text')
      .setDescription('Search verses by text or reference')
      .addStringOption((opt) =>
        opt
          .setName('query')
          .setDescription('Search query')
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
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('topic')
      .setDescription('Summarize results by book')
      .addStringOption((opt) =>
        opt
          .setName('query')
          .setDescription('Search query')
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
      )
  );

module.exports.execute = execute;
