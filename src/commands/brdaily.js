const { SlashCommandBuilder, ChannelType } = require('discord.js');
const moment = require('moment-timezone');
const {
  getSettings,
  setSettings,
  clearSettings,
} = require('../db/guild-settings');
const { setupDailyVerse } = require('../../scheduler/dailyVerseScheduler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brdaily')
    .setDescription('Manage daily verse scheduling')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Configure daily verse posting')
        .addStringOption((opt) =>
          opt
            .setName('time')
            .setDescription('Time in HH:mm 24-hour format')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('timezone')
            .setDescription('IANA timezone, e.g., America/New_York')
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Target channel')
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show current configuration')
    )
    .addSubcommand((sub) =>
      sub.setName('clear').setDescription('Clear daily verse configuration')
    ),
  async execute(interaction) {
    const allowed = process.env.BRDAILY_ALLOWED_ROLES;
    const allowedRoles = allowed
      ? allowed.split(',').map((id) => id.trim()).filter(Boolean)
      : [];
    if (
      allowedRoles.length &&
      !interaction.member.roles.cache.some((role) =>
        allowedRoles.includes(role.id)
      )
    ) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const time = interaction.options.getString('time');
      const timezone = interaction.options.getString('timezone');
      const channel =
        interaction.options.getChannel('channel') || interaction.channel;
      if (!moment(time, 'HH:mm', true).isValid()) {
        return interaction.reply({
          content: 'Invalid time format. Use HH:mm (24-hour).',
          ephemeral: true,
        });
      }
      if (!moment.tz.zone(timezone)) {
        return interaction.reply({
          content: 'Invalid timezone.',
          ephemeral: true,
        });
      }
      const norm = moment(time, 'HH:mm').format('HH:mm');
      await setSettings(interaction.guild.id, channel.id, norm, timezone);
      await setupDailyVerse(interaction.client);
      await interaction.reply({
        content: `Daily verse set for <#${channel.id}> at ${norm} ${timezone}.`,
        ephemeral: true,
      });
    } else if (sub === 'status') {
      const row = await getSettings(interaction.guild.id);
      if (!row) {
        return interaction.reply({
          content: 'No daily verse configured.',
          ephemeral: true,
        });
      }
      await interaction.reply({
        content: `Channel: <#${row.channel_id}>\nTime: ${row.time} ${row.timezone}`,
        ephemeral: true,
      });
    } else if (sub === 'clear') {
      await clearSettings(interaction.guild.id);
      await setupDailyVerse(interaction.client);
      await interaction.reply({
        content: 'Daily verse configuration cleared.',
        ephemeral: true,
      });
    }
  },
};
