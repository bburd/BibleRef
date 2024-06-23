// commands/brsearch.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

function setupDatabaseConnections() {
  const dbPaths = {
    strong_dict: "../strong_dict.db",
    kjv_acrostics: "../kjv_acrostics.db",
    kjv_pure: "../kjv_pure.db",
    strong_pure: "../strong_pure.db",
  };
  const connections = {};
  Object.entries(dbPaths).forEach(([key, dbPath]) => {
    connections[key] = new sqlite3.Database(
      path.join(__dirname, dbPath),
      sqlite3.OPEN_READONLY,
      (err) => {
        if (err) {
          console.error(`Error opening database ${key}:`, err.message);
        } else {
          console.log(`Connected to the SQLite database: ${key}`);
        }
      }
    );
  });
  return connections;
}

const dbConnections = setupDatabaseConnections();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brsearch")
    .setDescription("Searches the Strong's dictionary")
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
  const queries = buildQueries(query);
  const results = await Promise.all(
    Object.entries(queries).map(async ([dbKey, { sql, params }]) => {
      try {
        return await queryDatabase(dbConnections[dbKey], sql, params);
      } catch (error) {
        console.error(`Error querying ${dbKey}:`, error);
        return []; // Return an empty array in case of an error to continue with other queries
      }
    })
  );
  return results.flat(); // Flatten the results array
}

function queryDatabase(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function buildQueries(query) {
  const queries = {};
  const singleWord = !query.includes(" ");
  const letterNumberPattern = /^[a-zA-Z]\d+$/; // Matches any letter followed by one or more digits
  const verseRangePattern = /^[a-zA-Z]+\s+\d+:\d+-\d+$/; // Matches verse ranges like "Luke 1:1-4"
  const versePattern = /^[a-zA-Z]+\s+\d+:\d+$/; // Matches Bible verse references like "Luke 1:1"

  if (verseRangePattern.test(query)) {
    const [book, chapterVerse] = query.split(" ");
    const [chapter, verses] = chapterVerse.split(":");
    const [startVerse, endVerse] = verses.split("-").map(Number);
    queries.kjv_pure = {
      sql: `SELECT verse_text, book_name FROM kjv_pure WHERE book_name LIKE ? AND chapter = ? AND verse BETWEEN ? AND ?`,
      params: [`${book}%`, chapter, startVerse, endVerse],
    };
  } else if (versePattern.test(query)) {
    queries.kjv_pure = {
      sql: `SELECT verse_text, book_name FROM kjv_pure WHERE book_name = ?`,
      params: [query],
    };
  } else if (singleWord && letterNumberPattern.test(query)) {
    queries.strong_dict = {
      sql: `SELECT key, transliteration, pronunciation, definitions FROM dictionary WHERE key LIKE ?`,
      params: [`%${query}%`],
    };
  } else {
    queries.kjv_acrostics = {
      sql: `SELECT key, value FROM acrostics WHERE value LIKE ?`,
      params: [`%${query}%`],
    };
    queries.kjv_pure = {
      sql: `SELECT verse_text, book_name FROM kjv_pure WHERE verse_text LIKE ? OR book_name LIKE ?`,
      params: [`%${query}%`, `%${query}%`],
    };
    queries.strong_pure = {
      sql: `SELECT text_part, strong_ref FROM strong_pure WHERE text_part LIKE ? OR strong_ref LIKE ?`,
      params: [`%${query}%`, `%${query}%`],
    };
  }

  return queries;
}

async function sendPaginatedResults(interaction, results, query) {
  const itemsPerPage = 10;
  const pages = [];
  const totalResults = results.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage);

  // Prepare the pages
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

    page.forEach((result, index) => {
      embed.addFields({
        name: `Result ${i + index + 1}`,
        value: `${result.book_name ? `${result.book_name} - ` : ""}${
          result.verse_text ||
          result.value ||
          "No detailed description available."
        }`,
        inline: false,
      });
    });
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
