// index.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { setupDailyVerse } = require("./scheduler/dailyVerseScheduler"); // Correct import
const handleAutocomplete = require("./src/interaction/autocomplete");
const handleContextButtons = require("./src/interaction/contextButtons");

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

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setupDailyVerse(client); // Set up the daily verse scheduler when the client is ready
});

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
      await interaction.reply({
        content: "Unknown command.",
        ephemeral: true,
      });
      return;
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Error executing command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  } else if (interaction.isButton()) {
    if (await handleContextButtons(interaction)) return;

    const handler = client.buttons.get(interaction.customId);
    if (!handler) {
      try {
        await interaction.reply({
          content: "Unknown button interaction.",
          ephemeral: true,
        });
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
        await interaction.reply({
          content: "There was an error while executing this action!",
          ephemeral: true,
        });
      }
    }
  }
});

client.login(process.env.TOKEN);
