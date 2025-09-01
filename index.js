// index.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { setupDailyVerse } = require("./scheduler/dailyVerseScheduler"); // Correct import
const { setupPlanScheduler } = require("./scheduler/planScheduler");
const { seed } = require("./src/boot/seedPlans");
const handleAutocomplete = require("./src/interaction/autocomplete");
const handleContextButtons = require("./src/interaction/contextButtons");
const { handleButtons: handleTriviaButtons } = require("./src/commands/brtrivia");
const { handleButtons: handleLexButtons } = require("./src/commands/brlex");
const { handleButtons: handleSearchButtons } = require("./commands/brsearch");
const { ephemeral } = require("./src/utils/ephemeral");

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

commandDirs.forEach((commandsPath) => {
  if (!fs.existsSync(commandsPath)) return;
  fs.readdir(commandsPath, (err, files) => {
    if (err) return console.error(err);
    files
      .filter((file) => file.endsWith(".js"))
      .forEach((file) => {
        const filePath = path.join(commandsPath, file);
        try {
          const command = require(filePath);
          client.commands.set(command.data.name, command);
          console.log(`Loaded command: ${file}`);
        } catch (err) {
          console.error(`Failed to load command ${file}:`, err);
        }
      });
  });
});

if (fs.existsSync(buttonsPath)) {
  fs.readdir(buttonsPath, (err, files) => {
    if (err) return console.error(err);
    files
      .filter((file) => file.endsWith(".js"))
      .forEach((file) => {
        const filePath = path.join(buttonsPath, file);
        const button = require(filePath);
        const id = button.id || button.customId || button.data?.name;
        if (id) {
          client.buttons.set(id, button);
        }
      });
  });
}

async function onClientReady(client) {
  console.log(`Logged in as ${client.user.tag}`);
  await seed();
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
      await interaction.reply(ephemeral({
        content: "Unknown command.",
      }));
      return;
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Error executing command:", error);
      await interaction.reply(
        ephemeral({ content: "There was an error while executing this command!" })
      );
    }
  } else if (interaction.isButton()) {
    const searchHandled = await handleSearchButtons(interaction);
    if (searchHandled) return;
    const triviaHandled = await handleTriviaButtons(interaction);
    if (triviaHandled) return;
    const lexHandled = await handleLexButtons(interaction);
    if (lexHandled) return;
    // Attempt to handle context-specific buttons before other handlers
    const contextHandled = await handleContextButtons(interaction);
    if (contextHandled) return;

    const handler = client.buttons.get(interaction.customId);
    if (!handler) {
      try {
        await interaction.reply(
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
      if (!interaction.replied) {
        await interaction.reply(
          ephemeral({ content: "There was an error while executing this action!" })
        );
      }
    }
  }
});

client.login(process.env.TOKEN);
