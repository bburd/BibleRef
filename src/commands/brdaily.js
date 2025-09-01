const { SlashCommandBuilder, ChannelType } = require('discord.js');
const moment = require('moment-timezone');
const {
  getSettings,
  setSettings,
  clearSettings,
} = require('../db/guild-settings');
const { setupDailyVerse } = require('../../scheduler/dailyVerseScheduler');
const { ephemeral } = require('../utils/ephemeral');

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
      await interaction.reply(
        ephemeral({
          content: 'You do not have permission to use this command.',
        })
      );
      return;
    }

    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const time = interaction.options.getString('time');
      const timezone = interaction.options.getString('timezone');
      const channel =
        interaction.options.getChannel('channel') || interaction.channel;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return interaction.reply(
          ephemeral({
            content: 'Invalid time format. Use HH:mm (24-hour).',
          })
        );
      }
      if (!moment.tz.zone(timezone)) {
        return interaction.reply(
          ephemeral({ content: 'Invalid timezone.' })
        );
      }
      const norm = time;
      await setSettings(interaction.guild.id, channel.id, norm, timezone);
      await setupDailyVerse(interaction.client);
      await interaction.reply(
        ephemeral({
          content: `Daily verse set for <#${channel.id}> at ${norm} ${timezone}.`,
        })
      );
    } else if (sub === 'status') {
      const row = await getSettings(interaction.guild.id);
      if (!row) {
        return interaction.reply(
          ephemeral({ content: 'No daily verse configured.' })
        );
      }
      await interaction.reply(
        ephemeral({
          content: `Channel: <#${row.channel_id}>\nTime: ${row.time} ${row.timezone}`,
        })
      );
    } else if (sub === 'clear') {
      await clearSettings(interaction.guild.id);
      await setupDailyVerse(interaction.client);
      await interaction.reply(
        ephemeral({ content: 'Daily verse configuration cleared.' })
      );
    }
  },
};
