const { MessageFlags } = require('discord-api-types/v10');

function ephemeral(base = {}) {
  return { ...base, flags: MessageFlags.Ephemeral };
}

module.exports = { ephemeral };
