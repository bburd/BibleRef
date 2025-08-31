// commands/brdaily.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const moment = require("moment-timezone");
const { setOne, getOne, clearOne } = require("../src/db/guild-settings");
const { setupDailyVerse } = require("../scheduler/dailyVerseScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brdaily")
    .setDescription("Manage daily verse settings.")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set daily verse delivery.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel for the daily verse.")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("time")
            .setDescription("Time in HH:mm format.")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("timezone")
            .setDescription("Timezone, e.g. America/New_York.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show current daily verse settings."))
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Clear daily verse settings.")),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "set") {
      const channel = interaction.options.getChannel("channel");
      const time = interaction.options.getString("time");
      const timezone = interaction.options.getString("timezone");

      if (!moment(time, "HH:mm", true).isValid()) {
        await interaction.reply({
          content: "Invalid time. Use HH:mm (24-hour format).",
          ephemeral: true,
        });
        return;
      }

      if (!moment.tz.zone(timezone)) {
        await interaction.reply({
          content: "Invalid timezone.",
          ephemeral: true,
        });
        return;
      }

      await setOne(interaction.guildId, channel.id, time, timezone);
      await setupDailyVerse(interaction.client);

      await interaction.reply({
        content: `Daily verse set for <#${channel.id}> at ${time} ${timezone}.`,
        ephemeral: true,
      });
    } else if (sub === "status") {
      const settings = await getOne(interaction.guildId);
      if (settings) {
        await interaction.reply({
          content: `Channel: <#${settings.channel_id}>\nTime: ${settings.time} ${settings.timezone}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "No daily verse settings found.",
          ephemeral: true,
        });
      }
    } else if (sub === "clear") {
      await clearOne(interaction.guildId);
      await setupDailyVerse(interaction.client);
      await interaction.reply({
        content: "Daily verse settings cleared.",
        ephemeral: true,
      });
    }
  },
};

