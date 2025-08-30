// index.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { setupDailyVerse } = require("./scheduler/dailyVerseScheduler"); // Correct import

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();
const commandsPath = path.join(__dirname, "commands");
const buttonsPath = path.join(__dirname, "buttons");

fs.readdir(commandsPath, (err, files) => {
  if (err) return console.error(err);
  files
    .filter((file) => file.endsWith(".js"))
    .forEach((file) => {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      client.commands.set(command.data.name, command);
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
  } else if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) {
      try {
        await interaction.respond([]);
      } catch (err) {
        console.error("Error responding to unknown autocomplete:", err);
      }
      return;
    }
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error("Error executing autocomplete handler:", error);
    }
  } else if (interaction.isButton()) {
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
