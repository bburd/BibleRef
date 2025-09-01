const { SlashCommandBuilder } = require('discord.js');
const { setUserTranslation } = require('../db/users');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brtranslation')
    .setDescription('Set your preferred Bible translation')
    .addStringOption(option =>
      option
        .setName('set')
        .setDescription('Translation to use')
        .setRequired(true)
        .addChoices(
          { name: 'ASV', value: 'asv' },
          { name: 'KJV', value: 'kjv' }
        )
    ),
  async execute(interaction) {
    const translation = interaction.options.getString('set');
    try {
      await setUserTranslation(interaction.user.id, translation);
      const pretty = translation === 'asv' ? 'ASV' : 'KJV';
      await interaction.reply({
        content: `Translation set to ${pretty}.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error('Error setting user translation:', err);
      await interaction.reply({
        content: 'Failed to set translation.',
        ephemeral: true,
      });
    }
  },
};
