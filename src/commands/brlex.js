const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Lazy-load Strong's dictionary
let lexiconCache = null;
function loadLexicon() {
  if (lexiconCache) return lexiconCache;
  try {
    const file = path.join(__dirname, "../../db/strongs-dictionary.json");
    const data = fs.readFileSync(file, "utf8");
    lexiconCache = JSON.parse(data);
  } catch (err) {
    console.error("Failed to load Strong's dictionary:", err.message);
    lexiconCache = {};
  }
  return lexiconCache;
}

function getLexEntry(strong) {
  const dict = loadLexicon();
  const key = strong.toUpperCase();
  return dict[key] || null;
}

function searchLexicon(query) {
  const dict = loadLexicon();
  const q = query.toLowerCase();
  const results = [];
  for (const [id, entry] of Object.entries(dict)) {
    const text = [id, entry.lemma, entry.translit, entry.definition]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (text.includes(q)) {
      results.push({ id, lemma: entry.lemma, gloss: entry.definition });
    }
    if (results.length >= 10) break;
  }
  return results;
}

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

function findVersesByStrong(strong, offset = 0, limit = 5) {
  const isGreek = strong.toUpperCase().startsWith("G");
  const dbFile = path.join(
    __dirname,
    `../../db/strongs-${isGreek ? "greek" : "hebrew"}.db`
  );

  return new Promise((resolve) => {
    if (!fs.existsSync(dbFile)) {
      resolve({ verses: [], total: 0 });
      return;
    }

    const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY);
    const verseSql =
      "SELECT book, chapter, verse, text FROM verses WHERE strong = ? LIMIT ? OFFSET ?";
    const countSql =
      "SELECT COUNT(*) as count FROM verses WHERE strong = ?";

    db.all(verseSql, [strong, limit, offset], (err, verseRows) => {
      if (err) {
        console.error("Error fetching verses:", err.message);
        db.close();
        resolve({ verses: [], total: 0 });
        return;
      }
      db.get(countSql, [strong], (err2, countRow) => {
        db.close();
        if (err2) {
          console.error("Error counting verses:", err2.message);
          resolve({ verses: verseRows || [], total: 0 });
        } else {
          resolve({ verses: verseRows || [], total: countRow.count || 0 });
        }
      });
    });
  });
}

function lexEmbed(strong, entry, verses, offset, total) {
  const embed = new EmbedBuilder()
    .setTitle(`${strong} - ${entry?.lemma || "Unknown"}`)
    .setColor("#0099ff");

  if (entry?.translit)
    embed.addFields({ name: "Transliteration", value: entry.translit, inline: true });
  if (entry?.derivation)
    embed.addFields({ name: "Derivation", value: entry.derivation, inline: false });
  if (entry?.definition)
    embed.addFields({ name: "Definition", value: entry.definition, inline: false });

  verses.forEach((v) => {
    const ref = `${v.book} ${v.chapter}:${v.verse}`;
    embed.addFields({ name: ref, value: v.text });
  });
  if (verses.length)
    embed.setFooter({
      text: `Verses ${offset + 1}-${offset + verses.length} of ${total}`,
    });

  return embed;
}

async function handleButtons(interaction) {
  const [action, payload] = interaction.customId.split(":");
  if (!action.startsWith("brlex_")) return;
  const state = unpackState(payload);
  if (!state || !state.strong) {
    await interaction.reply({
      content: "Invalid button state.",
      ephemeral: true,
    });
    return;
  }
  const { strong, offset = 0 } = state;
  const entry = getLexEntry(strong);
  const { verses, total } = await findVersesByStrong(strong, offset, 5);
  const embed = lexEmbed(strong, entry, verses, offset, total);

  const prevState = packState({ strong, offset: Math.max(0, offset - 5) });
  const nextState = packState({ strong, offset: offset + 5 });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`brlex_prev:${prevState}`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset <= 0),
    new ButtonBuilder()
      .setCustomId(`brlex_next:${nextState}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset + verses.length >= total)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brlex")
    .setDescription("Lookup Strong's lexicon")
    .addSubcommand((sub) =>
      sub
        .setName("id")
        .setDescription("Lookup by Strong's number")
        .addStringOption((opt) =>
          opt
            .setName("strong")
            .setDescription("Strong's number, e.g., G25")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("search")
        .setDescription("Search Strong's entries")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Search text")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "id") {
      const strong = interaction.options.getString("strong");
      const entry = getLexEntry(strong);
      if (!entry) {
        await interaction.reply({
          content: `No entry found for ${strong}.`,
          ephemeral: true,
        });
        return;
      }
      const { verses, total } = await findVersesByStrong(strong, 0, 5);
      const embed = lexEmbed(strong, entry, verses, 0, total);

      const prevState = packState({ strong, offset: 0 });
      const nextState = packState({ strong, offset: 5 });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`brlex_prev:${prevState}`)
          .setLabel("Prev")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`brlex_next:${nextState}`)
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(verses.length >= total)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    } else if (sub === "search") {
      const query = interaction.options.getString("query");
      const results = searchLexicon(query);
      if (!results.length) {
        await interaction.reply({
          content: "No matches found.",
          ephemeral: true,
        });
        return;
      }
      const lines = results.map(
        (r) => `${r.id} - ${r.lemma || ""}${r.gloss ? ` - ${r.gloss}` : ""}`
      );
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`Search results for "${query}"`)
        .setDescription(lines.join("\n"));
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  handleButtons,
};

