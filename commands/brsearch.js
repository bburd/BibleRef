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
const SearchEngine = require("../SearchEngine");

function packState(state) {
  return Buffer.from(JSON.stringify(state)).toString("base64");
}

function unpackState(str) {
  try {
    return JSON.parse(Buffer.from(str, "base64").toString());
  } catch (err) {
    return null;
  }
}

function setupDatabaseConnections() {
  const dbPaths = {
    bible_db: "../kjv_bible.db", // Updated path for your database
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
    .setDescription("Searches the KJV Bible")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("text")
        .setDescription("Search by verse reference or text")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("The search query")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("topic")
        .setDescription("Search by topic phrase")
        .addStringOption((option) =>
          option
            .setName("phrase")
            .setDescription("Phrase to search")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "topic") {
      const phrase = interaction.options.getString("phrase");
      await interaction.deferReply();
      try {
        await performTopicSearch(interaction, phrase);
      } catch (error) {
        console.error("Error performing topic search:", error);
        await interaction.editReply(
          "There was an error executing this command."
        );
      }
      return;
    }

    const query = interaction.options.getString("query");
    await interaction.deferReply();
    try {
      await sendPaginatedResults(interaction, query);
    } catch (error) {
      console.error("Error performing search:", error);
      await interaction.editReply("There was an error executing this command.");
    }
  },
  handleButtons,
};

async function performSearch(query, offset, limit) {
  let rows = [];
  let total = 0;
  try {
    const isVersePattern = /^[a-zA-Z]+\s+\d+:\d+(-\d+)?$/; // Matches verses like "John 3:16" or "John 3:16-17"
    const isTextPattern = /^".*"$/; // Matches phrases enclosed in quotes, e.g., "In the beginning"

    if (isVersePattern.test(query)) {
      const [book, chapterVerse] = query.split(" ");
      const [chapter, verses] = chapterVerse.split(":");
      const [startVerse, endVerse] = verses.includes("-")
        ? verses.split("-").map(Number)
        : [Number(verses), Number(verses)];

      rows = await queryDatabase(
        dbConnections.bible_db,
        `SELECT book_name, chapter, verse, text FROM kjv WHERE book_name LIKE ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse LIMIT ? OFFSET ?`,
        [`${book}%`, chapter, startVerse, endVerse, limit, offset]
      );
      const countRows = await queryDatabase(
        dbConnections.bible_db,
        `SELECT COUNT(*) as count FROM kjv WHERE book_name LIKE ? AND chapter = ? AND verse BETWEEN ? AND ?`,
        [`${book}%`, chapter, startVerse, endVerse]
      );
      total = countRows[0]?.count || 0;
    } else if (isTextPattern.test(query)) {
      const searchText = query.slice(1, -1); // Remove quotes
      rows = await queryDatabase(
        dbConnections.bible_db,
        `SELECT book_name, chapter, verse, text FROM kjv WHERE text LIKE ? LIMIT ? OFFSET ?`,
        [`%${searchText}%`, limit, offset]
      );
      const countRows = await queryDatabase(
        dbConnections.bible_db,
        `SELECT COUNT(*) as count FROM kjv WHERE text LIKE ?`,
        [`%${searchText}%`]
      );
      total = countRows[0]?.count || 0;
    } else {
      // Fallback to book name search or keyword search
      rows = await queryDatabase(
        dbConnections.bible_db,
        `SELECT book_name, chapter, verse, text FROM kjv WHERE book_name LIKE ? OR text LIKE ? LIMIT ? OFFSET ?`,
        [`%${query}%`, `%${query}%`, limit, offset]
      );
      const countRows = await queryDatabase(
        dbConnections.bible_db,
        `SELECT COUNT(*) as count FROM kjv WHERE book_name LIKE ? OR text LIKE ?`,
        [`%${query}%`, `%${query}%`]
      );
      total = countRows[0]?.count || 0;
    }
  } catch (error) {
    console.error("Error executing search:", error);
  }
  return { rows, total };
}

function queryDatabase(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function performTopicSearch(interaction, phrase) {
  const adapter = new SearchEngine();
  const wideResults = await adapter.search(phrase);
  const verses = wideResults.kjv_pure || [];

  const clusters = verses.reduce((acc, row) => {
    const book = row.book_name || row.book || "Unknown";
    acc[book] = (acc[book] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(clusters).sort((a, b) => b[1] - a[1]);

  if (!sorted.length) {
    await interaction.editReply("No results found.");
    return;
  }

  const topBuckets = sorted.slice(0, 10);
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`Topic results for "${phrase}"`)
    .setDescription("Top books containing the phrase");

  for (const [book, count] of topBuckets) {
    embed.addFields({ name: String(book), value: `${count} hits`, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

function buildSearchEmbed(results, query, offset, total) {
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(
      `Search Results for "${query}" are available for 10 minutes. If you need more time use the command again.`
    )
    .setDescription(
      `Showing results ${offset + 1} - ${offset + results.length} of ${total}`
    );

  results.forEach((result, idx) => {
    const completeVerse = `${result.book_name} ${result.chapter}:${result.verse} - ${result.text}`;
    embed.addFields({
      name: `Result ${offset + idx + 1}`,
      value: completeVerse,
      inline: false,
    });
  });

  return embed;
}

function getPaginationRow(query, offset, limit, total) {
  const lastOffset = Math.floor((total - 1) / limit) * limit;
  const firstState = packState({ query, offset: 0, limit, total });
  const prevState = packState({
    query,
    offset: Math.max(0, offset - limit),
    limit,
    total,
  });
  const nextState = packState({ query, offset: offset + limit, limit, total });
  const lastState = packState({ query, offset: lastOffset, limit, total });

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`brsearch_first:${firstState}`)
      .setLabel("|<")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset === 0),
    new ButtonBuilder()
      .setCustomId(`brsearch_prev:${prevState}`)
      .setLabel("<")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset === 0),
    new ButtonBuilder()
      .setCustomId(`brsearch_next:${nextState}`)
      .setLabel(">")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset + limit >= total),
    new ButtonBuilder()
      .setCustomId(`brsearch_last:${lastState}`)
      .setLabel(">|")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset + limit >= total)
  );
}

async function sendPaginatedResults(interaction, query) {
  const limit = 10;
  const { rows, total } = await performSearch(query, 0, limit);
  if (!rows.length) {
    await interaction.editReply("No results found.");
    return;
  }

  const embed = buildSearchEmbed(rows, query, 0, total);
  const row = getPaginationRow(query, 0, limit, total);
  const totalPages = Math.ceil(total / limit);

  await interaction.editReply({
    embeds: [embed],
    content: `Page 1 of ${totalPages}`,
    components: [row],
  });
}

async function handleButtons(interaction) {
  const [action, payload] = interaction.customId.split(":");
  if (!action.startsWith("brsearch_")) return false;
  const state = unpackState(payload);
  if (!state || !state.query) {
    await interaction.reply({
      content: "Invalid button state.",
      ephemeral: true,
    });
    return true;
  }

  const { query, offset, limit, total } = state;
  const lastOffset = Math.floor((total - 1) / limit) * limit;
  let newOffset = offset;
  if (action === "brsearch_next") {
    newOffset = Math.min(offset + limit, lastOffset);
  } else if (action === "brsearch_prev") {
    newOffset = Math.max(offset - limit, 0);
  } else if (action === "brsearch_first") {
    newOffset = 0;
  } else if (action === "brsearch_last") {
    newOffset = lastOffset;
  }

  const { rows } = await performSearch(query, newOffset, limit);
  const embed = buildSearchEmbed(rows, query, newOffset, total);
  const row = getPaginationRow(query, newOffset, limit, total);
  const totalPages = Math.ceil(total / limit);
  const pageNumber = Math.floor(newOffset / limit) + 1;

  await interaction.update({
    embeds: [embed],
    content: `Page ${pageNumber} of ${totalPages}`,
    components: [row],
  });
  return true;
}
