const { nameToId } = require('../lib/books');

function parseRef(input = '') {
  const str = String(input).trim();
  if (!str) return null;

  let bookId = null;
  let rest = '';

  // Numeric book IDs at the start
  const numMatch = str.match(/^(\d+)\b\s*(.*)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 66) {
      bookId = num;
      rest = numMatch[2].trim();
    }
  }

  if (!bookId) {
    const idx = str.search(/\d/);
    let bookPart;
    if (idx === -1) {
      bookPart = str;
      rest = '';
    } else {
      bookPart = str.slice(0, idx).trim();
      rest = str.slice(idx).trim();
    }
    bookId = nameToId(bookPart);
  }

  if (!bookId) return null;
  if (!rest) return { book: bookId };

  const chapVerse = rest.match(/^(\d+)(?::(.*))?$/);
  if (!chapVerse) return null;
  const chapter = parseInt(chapVerse[1], 10);
  if (!chapter) return null;

  const versesPart = chapVerse[2];
  if (!versesPart) {
    // whole chapter
    return { book: bookId, chapter };
  }

  const verses = [];
  for (const segRaw of versesPart.split(/[,;]/)) {
    const seg = segRaw.trim();
    if (!seg) continue;
    if (seg.includes('-')) {
      const [startStr, endStr] = seg.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (start && end && end >= start) {
        for (let v = start; v <= end; v++) verses.push(v);
      }
    } else {
      const v = parseInt(seg, 10);
      if (v) verses.push(v);
    }
  }

  if (verses.length === 0) return { book: bookId, chapter };
  const unique = [...new Set(verses)].sort((a, b) => a - b);
  return { book: bookId, chapter, verses: unique };
}

module.exports = { parseRef };
