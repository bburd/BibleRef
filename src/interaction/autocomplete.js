const { quickSuggestBooks } = require('../lib/books');

module.exports = async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  const value = focused.value.trim();

  if (value.length < 2) {
    await interaction.respond([]);
    return;
  }

  try {
    let choices = [];
    if (focused.name === 'book') {
      choices = quickSuggestBooks(value);
    }
    await interaction.respond(choices.slice(0, 25));
  } catch (err) {
    if (process.env.DEBUG_BIBLE === '1') {
      console.error('Autocomplete error:', err);
    }
    try {
      await interaction.respond([]);
    } catch (e) {
      if (process.env.DEBUG_BIBLE === '1') {
        console.error('Failed to send autocomplete response:', e);
      }
    }
  }
};

