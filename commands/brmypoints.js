// commands/brmypoints.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { getScore, getRank } = require("../src/db/trivia");

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brmypoints")
    .setDescription("Displays your trivia points and ranking."),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      const userScore = await getScore(userId);
      if (!userScore) {
        await interaction.editReply("You have no points recorded.");
        return;
      }
      const rank = await getRank(userId);
      await interaction.editReply(
        `You are ${getOrdinal(rank)} with ${userScore.score} point(s).`
      );
    } catch (error) {
      console.error("Failed to load points data:", error);
      await interaction.editReply("Failed to load points data.");
    }
  },
};
