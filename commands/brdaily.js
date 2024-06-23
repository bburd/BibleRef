// commands/brdaily.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { getCurrentDailyVerse } = require("../scheduler/dailyVerseScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brdaily")
    .setDescription("Receives the daily verse."),
  async execute(interaction) {
    const currentDailyVerse = getCurrentDailyVerse();

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
  },
};
