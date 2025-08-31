const { openReading } = require('../db/openReading');
const { getUserTranslation } = require('../db/users');

/**
 * Resolve the user-selected translation and open a reading adapter.
 * Falls back to the user's preferred translation or ASV when none is provided.
 *
 * @param {import('discord.js').CommandInteraction} interaction Discord interaction
 * @returns {Promise<{adapter: object, translation: string}>} The opened adapter and resolved translation
 */
async function openReadingAdapter(interaction) {
  let translation = interaction.options.getString('translation');
  if (!translation) {
    translation = (await getUserTranslation(interaction.user.id)) || 'asv';
  }
  const adapter = await openReading(translation);
  return { adapter, translation };
}

module.exports = openReadingAdapter;
