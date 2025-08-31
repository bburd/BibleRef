// commands/brdaily.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { getCurrentDailyVerse, setupDailyVerse } = require("../scheduler/dailyVerseScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brdaily")
    .setDescription("Receives the daily verse."),
  async execute(interaction) {
    const currentDailyVerse = getCurrentDailyVerse(interaction.guildId);

    if (currentDailyVerse) {
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Today's Daily Verse")
        .setDescription(currentDailyVerse)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply("No daily verse has been set yet.");
    }

    // Reschedule tasks in case configuration has changed
    await setupDailyVerse(interaction.client);
  },
};
