// commands/brmypoints.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { getScore } = require('../src/db/trivia');

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brmypoints')
    .setDescription('Displays your trivia points and ranking.'),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const userId = interaction.user.id;
      const row = await getScore(userId);
      if (!row) {
        await interaction.editReply('You have no points recorded.');
        return;
      }
      const replyMessage = `You are ${getOrdinal(row.rank)} with ${row.score} point(s).`;
      await interaction.editReply(replyMessage);
    } catch (err) {
      console.error('Failed to load points data:', err);
      await interaction.editReply('Failed to load points data.');
    }
  },
};
