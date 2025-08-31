// commands/brmypoints.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs").promises;

// Path to the JSON file where scores are stored
const scoresFilePath = "scores.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brmypoints")
    .setDescription("Displays your trivia points and ranking."),
  async execute(interaction) {
    await interaction.deferReply(); // Ensure the interaction is acknowledged

    let scores = {};
    try {
      const data = await fs.readFile(scoresFilePath, "utf8");
      scores = JSON.parse(data); // Parse the JSON data
    } catch (error) {
      console.error("Failed to read scores file:", error);
      await interaction.editReply("Failed to load points data.");
      return;
    }

    // Get user ID from interaction
    const userId = interaction.user.id;

    // Find the user's score
    const userScore = scores[userId];

    // Create an array of scores and sort it
    const scoreArray = Object.entries(scores).map(([id, data]) => ({
      id,
      score: data.score,
      username: data.username,
    }));

    // Sort by score in descending order
    scoreArray.sort((a, b) => b.score - a.score);

    // Find the ranking of the user
    const ranking = scoreArray.findIndex((score) => score.id === userId) + 1; // +1 because index starts at 0

    // Generate ordinal suffix for the ranking
    function getOrdinal(n) {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Check if the user is in the score list
    if (userScore) {
      // If found, create a message with their points and ranking
      const replyMessage = `You are ${getOrdinal(ranking)} with ${
        userScore.score
      } point(s).`;
      await interaction.editReply(replyMessage);
    } else {
      // If not found, notify the user
      await interaction.editReply("You have no points recorded.");
    }
  },
};
