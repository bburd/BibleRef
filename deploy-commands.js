// Please forgive me for this awful code...
// It is my first project, courtesy of ChatGPT 4o. -bburd

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Routes } = require("discord-api-types/v10");
const { fetchWithRetry } = require("./utils/http");

const commands = [];
const commandDirs = ["./commands", "./src/commands"];

for (const dir of commandDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".js"));
  for (const file of files) {
    const command = require(path.join(dir, file));
    commands.push(command.data.toJSON());
  }
}

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.TOKEN}`,
    };
    const baseUrl = "https://discord.com/api/v10";

    if (process.env.GUILD_ID) {
      const url =
        baseUrl +
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          process.env.GUILD_ID
        );
      const res = await fetchWithRetry(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(commands),
      });
      if (!res.ok) {
        throw new Error(`Failed to reload guild commands: ${res.status}`);
      }
      console.log(
        "Successfully reloaded guild-specific application (/) commands."
      );
    } else {
      const url = baseUrl + Routes.applicationCommands(process.env.CLIENT_ID);
      const res = await fetchWithRetry(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(commands),
      });
      if (!res.ok) {
        throw new Error(`Failed to reload global commands: ${res.status}`);
      }
      console.log("Successfully reloaded global application (/) commands.");
    }
  } catch (error) {
    console.error(error);
  }
})();
