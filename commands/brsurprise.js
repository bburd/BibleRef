const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getUserTranslation } = require('../src/db/user-prefs');
const { openReading } = require('../src/db/openReading');
const { idToName } = require('../src/lib/books');

const BTN_MORE = 'brs:m'; // short customId

async function drawRandom(translationPref) {
  const adapter = await openReading(translationPref); // prefers plain, falls back to strongs+strip
  try {
    const row = await adapter.getRandom();
    return row; // {book, chapter, verse, text}
  } finally {
    if (adapter && adapter.close) adapter.close();
  }
}

function buildEmbed(row, humanTrans, pageTag = '') {
  const ref = `${idToName(row.book)} ${row.chapter}:${row.verse}`;
  const title = pageTag ? `Random Verse ${pageTag}` : 'Random Verse';
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**${ref}** — ${row.text}`)
    .setFooter({ text: humanTrans.toUpperCase() });
}

function buildRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(BTN_MORE).setLabel('Another').setStyle(ButtonStyle.Secondary)
  );
}

module.exports.data = new SlashCommandBuilder()
  .setName('brsurprise')
  .setDescription('Get a random Bible verse')
  .addStringOption(opt =>
    opt.setName('translation')
      .setDescription('Force translation (default: your preference)')
      .addChoices({ name: 'ASV', value: 'asv' }, { name: 'KJV', value: 'kjv' })
  );

module.exports.execute = async (interaction) => {
  await interaction.deferReply();
  const forced = (interaction.options.getString('translation') || '').toLowerCase();
  let userPref = await getUserTranslation(interaction.user.id);
  if (userPref === 'asvs') userPref = 'asv';
  if (userPref === 'kjv_strongs') userPref = 'kjv';
  const t = forced || userPref || 'asv';

  const row = await drawRandom(t);
  if (!row) return interaction.editReply({ content: 'No verse available.', flags: 64 });

  const embed = buildEmbed(row, t);
  await interaction.editReply({ content: null, embeds: [embed], components: [buildRow()] });
};

module.exports.handleButtons = async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== BTN_MORE) return false;

  // try to recover the translation label from footer; if missing, fall back to user pref
  const prevFooter = interaction.message?.embeds?.[0]?.footer?.text?.toLowerCase();
  const fromEmbed = (prevFooter === 'asv' || prevFooter === 'kjv') ? prevFooter : null;

  let userPref = await getUserTranslation(interaction.user.id);
  if (userPref === 'asvs') userPref = 'asv';
  if (userPref === 'kjv_strongs') userPref = 'kjv';
  const t = fromEmbed || userPref || 'asv';

  const row = await drawRandom(t);
  if (!row) {
    await interaction.reply({ content: 'No verse available.', flags: 64 });
    return true;
  }
  const pageTag = '(another)';
  const embed = buildEmbed(row, t, pageTag);
  await interaction.update({ content: null, embeds: [embed], components: [buildRow()] });
  return true;
};
