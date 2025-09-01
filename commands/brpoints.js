// commands/brpoints.js
const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { top } = require('../src/db/trivia');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brpoints')
    .setDescription('Displays the trivia points standings for the top 10 players.'),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const scores = await top(10);
      const medals = ['🥇', '🥈', '🥉'];
      const description =
        scores
          .map((row, index) => {
            const medal = medals[index] || '';
            return `${medal} ${index + 1}. ${row.username} - ${row.score} points`;
          })
          .join('\n') || 'No scores available.';
      const embed = new EmbedBuilder()
        .setTitle('Top 10 Trivia Points Leaders')
        .setDescription(description);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to load points data:', err);
      await interaction.editReply('Failed to load points data.');
    }
  },
};
