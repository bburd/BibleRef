const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const { nameToId, idToName } = require('../lib/books');
const openReadingAdapter = require('../utils/openReadingAdapter');
const contextRow = require('../ui/contextRow');

// Register font
const fontPath = path.join(__dirname, '..', '..', 'assets', 'Inter-Regular.ttf');
try {
  GlobalFonts.registerFromPath(fontPath, 'Inter');
} catch (e) {
  // ignore if font already registered
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
  }
  return y + lineHeight;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brcardverse')
    .setDescription('Fetch a verse from the Bible and render it on a card')
    .addStringOption(option =>
      option
        .setName('book')
        .setDescription('Book of the Bible')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('chapter')
        .setDescription('Chapter number')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('verse')
        .setDescription('Verse number')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('translation')
        .setDescription('Bible translation')
        .addChoices(
          { name: 'ASV', value: 'asv' },
          { name: 'KJV', value: 'kjv' }
        )
    ),

  async execute(interaction) {
    const bookArg = interaction.options.getString('book');
    const chapter = interaction.options.getInteger('chapter');
    const verseNum = interaction.options.getInteger('verse');

    let bookId = Number(bookArg);
    if (Number.isNaN(bookId)) {
      bookId = nameToId(bookArg);
    }
    if (!bookId) {
      await interaction.reply({ content: 'Unknown book.', ephemeral: true });
      return;
    }

    let adapter;
    let translation;
    try {
      ({ adapter, translation } = await openReadingAdapter(interaction));
      const result = await adapter.getVerse(bookId, chapter, verseNum);
      if (!result) {
        await interaction.reply('Verse not found.');
        return;
      }
      const bookName = idToName(result.book);
      const verseText = result.text;

      const width = 1200;
      const height = 630;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#4e54c8');
      gradient.addColorStop(1, '#8f94fb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const margin = 60;
      const maxWidth = width - margin * 2;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.font = "48px 'Inter'";
      const y = drawWrappedText(ctx, verseText, margin, margin, maxWidth, 60);

      ctx.font = "bold 36px 'Inter'";
      const refText = `${bookName} ${result.chapter}:${result.verse} (${translation.toUpperCase()})`;
      ctx.fillText(refText, margin, height - margin - 36);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'verse.png' });
      const components = contextRow.build({
        book: result.book,
        chapter: result.chapter,
        verse: result.verse,
        translation,
      });
      await interaction.reply({ files: [attachment], components });
    } catch (err) {
      console.error('Error fetching verse:', err);
      await interaction.reply('There was an error fetching the verse.');
    } finally {
      if (adapter && adapter.close) adapter.close();
    }
  },
};

