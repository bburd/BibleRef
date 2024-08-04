// commands/brhelp.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brhelp")
    .setDescription("Lists all available commands and their descriptions."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("List of Available Commands Below")
      .setDescription("Here are the commands you can use:")
      .addFields(
        { name: "/brdaily", value: "Sends the daily verse.", inline: false },
        {
          name: "/brmypoints",
          value: "Displays your trivia points and ranking.",
          inline: false,
        },
        {
          name: "/brpoints",
          value: "Displays the trivia points standings for the top 10 players.",
          inline: false,
        },
        {
          name: "/brsearch",
          value: "Searches the King James Bible.",
          inline: false,
        },
        {
          name: "/brtrivia",
          value:
            "Starts a Bible trivia game with the option of choosing a category.",
          inline: false,
        },
        {
          name: "/brverse",
          value: "Sends a random verse from the King James Bible.",
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
