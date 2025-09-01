const { SlashCommandBuilder } = require('discord.js');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { idToName } = require('../src/lib/books');
const openReadingAdapter = require('../src/utils/openReadingAdapter');
const { openReading } = require('../src/db/openReading');
const searchSmart = require('../src/search/searchSmart');

const MAX_TEXT_RESULTS = 50;
const MAX_TOPIC_RESULTS = 200;
const MESSAGE_LIMIT = 2000;

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
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function splitPages(lines, limit = MESSAGE_LIMIT) {
  const pages = [];
  let buffer = [];
  let length = 0;
  for (const line of lines) {
    const addition = (buffer.length ? 1 : 0) + line.length;
    if (length + addition > limit) {
      pages.push(buffer.join('\n'));
      buffer = [line];
      length = line.length;
    } else {
      buffer.push(line);
      length += addition;
    }
  }
  if (buffer.length) pages.push(buffer.join('\n'));
  return pages;
}

function buildButtons(type, query, translation, page, total) {
  const buttons = [];
  if (page > 0) {
    const payload = encode({ type, query, translation, page: page - 1 });
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`brsearch:prev:${payload}`)
        .setLabel('Prev')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  if (page < total - 1) {
    const payload = encode({ type, query, translation, page: page + 1 });
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`brsearch:next:${payload}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  return buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [];
}

async function textPage(query, translation, page = 0, adapter) {
  let own = false;
  if (!adapter) {
    adapter = await openReading(translation);
    own = true;
  }
  try {
    const results = await searchSmart(adapter, query, MAX_TEXT_RESULTS);
    if (!results.length) return { content: 'No results found.', components: [] };
    const lines = results.map(
      (r) => `${idToName(r.book)} ${r.chapter}:${r.verse} - ${r.snippet || r.text}`
    );
    const pages = splitPages(lines);
    if (!pages.length) return { content: 'No results found.', components: [] };
    if (page >= pages.length) page = pages.length - 1;
    let content = pages[page];
    const pageInfo = pages.length > 1 ? `\n\nPage ${page + 1}/${pages.length}` : '';
    if (content.length + pageInfo.length <= MESSAGE_LIMIT) content += pageInfo;
    const components = buildButtons('text', query, translation, page, pages.length);
    return { content, components };
  } finally {
    if (own && adapter && adapter.close) adapter.close();
  }
}

function summarizeTopic(results) {
  const groups = new Map();
  results.forEach((r) => {
    if (!groups.has(r.book)) groups.set(r.book, []);
    groups.get(r.book).push(r);
  });
  const clusters = Array.from(groups.entries()).map(([book, rows]) => {
    rows.sort((a, b) =>
      a.chapter - b.chapter || a.verse - b.verse
    );
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

async function topicPage(query, translation, page = 0, adapter) {
  let own = false;
  if (!adapter) {
    adapter = await openReading(translation);
    own = true;
  }
  try {
    const results = await searchSmart(adapter, query, MAX_TOPIC_RESULTS);
    if (!results.length) return { content: 'No results found.', components: [] };
    const lines = summarizeTopic(results);
    const pages = splitPages(lines);
    if (!pages.length) return { content: 'No results found.', components: [] };
    if (page >= pages.length) page = pages.length - 1;
    let content = pages[page];
    const pageInfo = pages.length > 1 ? `\n\nPage ${page + 1}/${pages.length}` : '';
    if (content.length + pageInfo.length <= MESSAGE_LIMIT) content += pageInfo;
    const components = buildButtons('topic', query, translation, page, pages.length);
    return { content, components };
  } finally {
    if (own && adapter && adapter.close) adapter.close();
  }
}

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const query = interaction.options.getString('query');
  await interaction.deferReply();
  let adapter;
  let translation;
  try {
    ({ adapter, translation } = await openReadingAdapter(interaction));
    const pageFn = sub === 'topic' ? topicPage : textPage;
    const res = await pageFn(query, translation, 0, adapter);
    await interaction.editReply(res);
  } catch (err) {
    console.error('Error performing search:', err);
    await interaction.editReply('There was an error executing this command.');
  } finally {
    if (adapter && adapter.close) adapter.close();
  }
}

async function handleButtons(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('brsearch:')) return false;
  const [, action, payload] = id.split(':');
  const data = decode(payload);
  if (!data) return false;
  let { type, query, translation, page } = data;
  if (action === 'next') page += 1;
  else if (action === 'prev') page -= 1;
  if (page < 0) page = 0;
  const pageFn = type === 'topic' ? topicPage : textPage;
  const res = await pageFn(query, translation, page);
  await interaction.update(res);
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
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
    ),
  execute,
  handleButtons,
};

