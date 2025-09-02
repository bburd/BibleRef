async function safeReply(interaction, data) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(data);
  }
  return interaction.reply(data);
}

module.exports = { safeReply };
