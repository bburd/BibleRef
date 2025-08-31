const { SlashCommandBuilder } = require('@discordjs/builders');
const { setUserTranslation } = require('../db/users');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translation')
    .setDescription('Set your preferred Bible translation')
    .addStringOption(option =>
      option
        .setName('set')
        .setDescription('Translation to use')
        .setRequired(true)
        .addChoices(
          { name: 'ASV', value: 'asvs' },
          { name: 'KJV Strongs', value: 'kjv_strongs' }
        )
    ),
  async execute(interaction) {
    const translation = interaction.options.getString('set');
    try {
      await setUserTranslation(interaction.user.id, translation);
      const pretty = translation === 'asvs' ? 'ASV' : 'KJV Strongs';
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
