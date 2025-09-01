const { SlashCommandBuilder } = require('discord.js');
const { ChannelType } = require('discord.js');
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
    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const timeInput = interaction.options.getString('time');
      const timezoneInput = interaction.options.getString('timezone');
      const channel =
        interaction.options.getChannel('channel') || interaction.channel;
      const parsedTime = moment(timeInput, 'HH:mm', true);
      if (!parsedTime.isValid()) {
        return interaction.reply({
          content: 'Invalid time format. Use HH:mm (24-hour).',
          ephemeral: true,
        });
      }
      const zone = moment.tz.zone(timezoneInput);
      if (!zone) {
        return interaction.reply({
          content: 'Invalid timezone.',
          ephemeral: true,
        });
      }
      const normalizedTime = parsedTime.format('HH:mm');
      const normalizedTimezone = zone.name;
      await setSettings(
        interaction.guild.id,
        channel.id,
        normalizedTime,
        normalizedTimezone
      );
      await setupDailyVerse(interaction.client);
      await interaction.reply({
        content: `Daily verse set for <#${channel.id}> at ${normalizedTime} ${normalizedTimezone}.`,
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
