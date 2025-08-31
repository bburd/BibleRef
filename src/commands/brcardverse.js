const { SlashCommandBuilder } = require("@discordjs/builders");
const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");
const { fetch } = require("undici");
const wrapText = require("../../utils/wrapText");

GlobalFonts.registerFromPath(
  path.join(__dirname, "../../assets/Inter-Regular.ttf"),
  "Inter"
);

async function openReadingAdapter(book, chapter, verse) {
  const ref = encodeURIComponent(`${book} ${chapter}:${verse}`);
  const url = `https://bible-api.com/${ref}?translation=kjv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);
  const data = await res.json();
  return data.text.trim();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brcardverse")
    .setDescription("Create a verse card image")
    .addStringOption((opt) =>
      opt
        .setName("reference")
        .setDescription("Verse reference, e.g., John 3:16")
        .setRequired(true)
    ),
  async execute(interaction) {
    const refInput = interaction.options.getString("reference");
    const match = refInput.match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+):(\d+)$/);
    if (!match) {
      await interaction.reply({
        content: "Invalid reference format. Use Book Chapter:Verse.",
        ephemeral: true,
      });
      return;
    }
    const [, book, chapter, verse] = match;
    let text;
    try {
      text = await openReadingAdapter(book, chapter, verse);
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "Failed to fetch verse.",
        ephemeral: true,
      });
      return;
    }

    const width = 1200;
    const height = 628;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#000000";
    ctx.font = "48px Inter";

    const maxWidth = width - 80;
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = 60;
    let y = 100;
    lines.forEach((line) => {
      ctx.fillText(line, 40, y);
      y += lineHeight;
    });

    ctx.font = "40px Inter";
    ctx.fillText(`${book} ${chapter}:${verse}`, 40, height - 80);

    const buffer = await canvas.encode("png");
    await interaction.reply({
      files: [{ attachment: buffer, name: "verse.png" }],
    });
  },
};
