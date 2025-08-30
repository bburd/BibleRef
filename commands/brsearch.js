// commands/brsearch.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const SearchEngine = require("../SearchEngine");
const searchEngine = new SearchEngine();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brsearch")
    .setDescription("Searches the KJV Bible")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The search query")
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query");
    await interaction.deferReply();
    try {
      const results = await performSearch(query);
      if (!results.length) {
        await interaction.editReply("No results found.");
        return;
      }

      await sendPaginatedResults(interaction, results, query);
    } catch (error) {
      console.error("Error performing search:", error);
      await interaction.editReply("There was an error executing this command.");
    }
  },
};

async function performSearch(query) {
  const results = [];
  try {
    const isVersePattern = /^[a-zA-Z]+\s+\d+:\d+(-\d+)?$/; // Matches verses like "John 3:16" or "John 3:16-17"
    const isTextPattern = /^".*"$/; // Matches phrases enclosed in quotes, e.g., "In the beginning"

    if (isVersePattern.test(query)) {
      const [book, chapterVerse] = query.split(" ");
      const [chapter, verses] = chapterVerse.split(":");
      const [startVerse, endVerse] = verses.includes("-")
        ? verses.split("-").map(Number)
        : [Number(verses), Number(verses)];

      const rows = await searchEngine.queryDatabase(
        "dbKjvPure",
        `SELECT book_name, chapter, verse, text FROM kjv_pure WHERE book_name LIKE ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse`,
        [`${book}%`, chapter, startVerse, endVerse]
      );

      results.push(...rows);
    } else {
      const term = isTextPattern.test(query)
        ? `"${query.slice(1, -1)}"`
        : query;
      const rows = await searchEngine.searchKjv(term);
      results.push(...rows);
    }
  } catch (error) {
    console.error("Error executing search:", error);
  }
  return results;
}

async function sendPaginatedResults(interaction, results, query) {
  const itemsPerPage = 10;
  const pages = [];
  const totalResults = results.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage);

  console.log(`Total results: ${totalResults}`);

  for (let i = 0; i < totalResults; i += itemsPerPage) {
    const page = results.slice(i, i + itemsPerPage);
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(
        `Search Results for "${query}" are available for 10 minutes. If you need more time use the command again.`
      )
      .setDescription(
        `Showing results ${i + 1} - ${Math.min(
          i + itemsPerPage,
          totalResults
        )} of ${totalResults}`
      );

    for (let index = 0; index < page.length; index++) {
      const result = page[index];
      const verseText = result.snippet || result.text;
      const completeVerse = `${result.book_name} ${result.chapter}:${result.verse} - ${verseText}`;

      embed.addFields({
        name: `Result ${i + index + 1}`,
        value: completeVerse,
        inline: false,
      });
    }
    pages.push(embed);
  }

  let currentPage = 0;

  const getPaginationRow = () => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("first")
        .setLabel("|<")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("<")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel(">")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1),
      new ButtonBuilder()
        .setCustomId("last")
        .setLabel(">|")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1)
    );
  };

  const message = await interaction.editReply({
    embeds: [pages[currentPage]],
    content: `Page ${currentPage + 1} of ${totalPages}`,
    components: [getPaginationRow()],
  });

  const collector = message.createMessageComponentCollector({ time: 600000 }); // 10 minutes

  collector.on("collect", async (i) => {
    if (i.customId === "next" && currentPage < totalPages - 1) {
      currentPage++;
    } else if (i.customId === "previous" && currentPage > 0) {
      currentPage--;
    } else if (i.customId === "first") {
      currentPage = 0;
    } else if (i.customId === "last") {
      currentPage = totalPages - 1;
    }

    await i.update({
      embeds: [pages[currentPage]],
      content: `Page ${currentPage + 1} of ${totalPages}`,
      components: [getPaginationRow()],
    });
  });

  collector.on("end", () => {
    message
      .edit({
        content: "Pagination ended. Use the command again if needed.",
        components: [],
      })
      .catch((error) =>
        console.error("Failed to edit message after collector end:", error)
      );
  });
}
