// commands/brpoints.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs").promises;

// Path to the JSON file where scores are stored
const scoresFilePath = "scores.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brpoints")
    .setDescription(
      "Displays the trivia points standings for the top 10 players."
    ),
  async execute(interaction) {
    await interaction.deferReply(); // Make sure to acknowledge the interaction

    let scores = {};
    try {
      const data = await fs.readFile(scoresFilePath, "utf8");
      scores = JSON.parse(data); // Parse the JSON data
    } catch (error) {
      console.error("Failed to read scores file:", error);
      await interaction.editReply("Failed to load points data.");
      return;
    }

    // Sort scores and pick the top 10
    const sortedScores = Object.entries(scores)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 10);

    // Medals for the top 3
    const medals = ["🥇", "🥈", "🥉"];
    // Construct the leaderboard description
    const description =
      sortedScores
        .map(([id, scoreData], index) => {
          const medal = medals[index] || ""; // Display medal if available
          return `${medal} ${index + 1}. ${scoreData.username} - ${
            scoreData.score
          } points`;
        })
        .join("\n") || "No scores available."; // Fallback if no scores

    // Create an embed to display the leaderboard
    const embed = new EmbedBuilder()
      .setTitle("Top 10 Trivia Points Leaders")
      .setDescription(description);

    await interaction.editReply({ embeds: [embed] }); // Send the embed in reply
  },
};
