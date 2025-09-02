// index.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { setupDailyVerse } = require("./scheduler/dailyVerseScheduler"); // Correct import
const { setupPlanScheduler } = require("./scheduler/planScheduler");
const handleAutocomplete = require("./src/interaction/autocomplete");
const handleContextButtons = require("./src/interaction/contextButtons");
const { ephemeral } = require("./src/utils/ephemeral");
const { safeReply } = require("./src/utils/safeReply");
const { activeTrivia, searchSessions } = require('./src/state/sessions');

try { require('./src/boot/seedPlans').seedAll(); }
catch (e) { console.warn('[seedPlans] skipped:', e.message); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Retain GuildMessageReactions for reaction-based trivia games
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();
const buttonsPath = path.join(__dirname, "buttons");
const commandDirs = [
  path.join(__dirname, "commands"),
  path.join(__dirname, "src", "commands"),
];

async function loadCommands() {
  for (const commandsPath of commandDirs) {
    if (!fs.existsSync(commandsPath)) continue;
    const files = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));
    for (const file of files) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = require(filePath);
        if (typeof command.build === "function") {
          command.data = await command.build();
        }
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${file}`);
      } catch (err) {
        console.error(`Failed to load command ${file}:`, err);
      }
    }
  }
}

function loadButtons() {
  if (!fs.existsSync(buttonsPath)) return;
  const files = fs
    .readdirSync(buttonsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of files) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);
    const id = button.id || button.customId || button.data?.name;
    if (id) {
      client.buttons.set(id, button);
    }
  }
}

async function onClientReady(client) {
  console.log(`Logged in as ${client.user.tag}`);
  setupDailyVerse(client); // Set up the daily verse scheduler when the client is ready
  setupPlanScheduler(client);
}

client.once("clientReady", onClientReady);
client.once("ready", onClientReady);

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    try {
      await handleAutocomplete(interaction);
    } catch (error) {
      console.error("Error executing autocomplete handler:", error);
    }
    return;
  }
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      await safeReply(
        interaction,
        ephemeral({
          content: "Unknown command.",
        })
      );
      return;
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Error executing command:", error);
      await safeReply(
        interaction,
        ephemeral({ content: "There was an error while executing this command!" })
      );
    }
  } else if (interaction.isButton()) {
    for (const cmd of client.commands.values()) {
      if (typeof cmd.handleButtons === 'function') {
        try {
          const handled = await cmd.handleButtons(interaction);
          if (handled) return;
        } catch (err) {
          console.error('Error in command button handler:', err);
        }
      }
    }
    const contextHandled = await handleContextButtons(interaction);
    if (contextHandled) return;

    const handler = client.buttons.get(interaction.customId);
    if (!handler) {
      try {
        await safeReply(
          interaction,
          ephemeral({ content: "Unknown button interaction." })
        );
      } catch (err) {
        console.error("Error replying to unknown button interaction:", err);
      }
      return;
    }
    try {
      await handler.execute(interaction);
    } catch (error) {
      console.error(`Error executing button handler ${interaction.customId}:`, error);
      await safeReply(
        interaction,
        ephemeral({ content: "There was an error while executing this action!" })
      );
    }
  }
});

client.on('messageDelete', (msg) => {
  activeTrivia.delete(msg.id);
  searchSessions.delete(msg.id);
});

(async () => {
  await loadCommands();
  loadButtons();
  client.login(process.env.TOKEN);
})();
