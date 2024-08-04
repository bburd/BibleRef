// commands/brverse.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Update the database path to use kjv_bible.db
const dbPath = path.join(__dirname, "..", "kjv_bible.db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brverse")
    .setDescription("Sends a random verse from the KJV Bible."),
  async execute(interaction) {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error("Error opening database:", err.message);
        return interaction.reply("There was an error opening the database.");
      }
    });

    db.serialize(() => {
      db.get(
        // Updated query to match the kjv table structure
        "SELECT id, text, book_name, chapter, verse FROM kjv ORDER BY RANDOM() LIMIT 1",
        (err, row) => {
          if (err) {
            console.error("Error fetching verse:", err.message);
            return interaction.reply("There was an error fetching a verse.");
          }

          let { id, text, book_name, chapter, verse } = row;
          let completeVerse = `${book_name} ${chapter}:${verse} - ${text}`;

          // Function to fetch additional verses if necessary
          const getNextVerses = () => {
            db.get(
              "SELECT text FROM kjv WHERE id = ?",
              [++id],
              (err, nextRow) => {
                if (err) {
                  console.error("Error fetching next verse:", err.message);
                  sendVerse(completeVerse); // Proceed with what we have
                  return;
                }
                if (nextRow) {
                  completeVerse += ` ${nextRow.text}`;
                  if (
                    !nextRow.text.trim().endsWith(",") &&
                    !nextRow.text.trim().endsWith(";")
                  ) {
                    // If the next verse does not end with a comma or semicolon, stop fetching
                    sendVerse(completeVerse);
                  } else {
                    // Continue fetching the next verse
                    getNextVerses();
                  }
                } else {
                  sendVerse(completeVerse);
                }
              }
            );
          };

          const sendVerse = (verse) => {
            const embed = new EmbedBuilder()
              .setColor("#0099ff")
              .setTitle("Random KJV Verse")
              .setDescription(verse);

            interaction.reply({ embeds: [embed] });

            // Close the database after interaction reply
            db.close((err) => {
              if (err) {
                console.error("Error closing the database:", err.message);
              }
            });
          };

          if (text.trim().endsWith(",") || text.trim().endsWith(";")) {
            getNextVerses();
          } else {
            sendVerse(completeVerse);
          }
        }
      );
    });
  },
};
