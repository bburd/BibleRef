const { SlashCommandBuilder } = require('discord.js');
const { setUserTranslation } = require('../db/user-prefs');
const { ephemeral } = require('../utils/ephemeral');

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
          { name: 'ASV (reading)', value: 'asv' },
          { name: 'KJV (reading)', value: 'kjv' }
        )
    ),
  async execute(interaction) {
    const t = interaction.options.getString('set');
    try {
      await setUserTranslation(interaction.user.id, t);
      await interaction.reply(
        ephemeral({
          content: `Saved. Your default reading translation is **${t.toUpperCase()}**.`,
        })
      );
    } catch (err) {
      console.error('Error setting user translation:', err);
      await interaction.reply(
        ephemeral({ content: 'Failed to set translation.' })
      );
    }
  },
};
