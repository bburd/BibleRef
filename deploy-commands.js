// Please forgive me for this awful code...
// It is my first project, courtesy of ChatGPT 4o. -bburd

require("dotenv").config();
const fs = require("fs");
const { fetchWithRetry } = require("./httpClient");

const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.TOKEN}`,
    };
    const baseUrl = "https://discord.com/api/v9";

    if (process.env.GUILD_ID) {
      const url = `${baseUrl}/applications/${process.env.CLIENT_ID}/guilds/${process.env.GUILD_ID}/commands`;
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
      const url = `${baseUrl}/applications/${process.env.CLIENT_ID}/commands`;
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
