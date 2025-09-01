const { nameToId } = require('./books');

// Expand verse specifications like "1-3,5" into [1,2,3,5]
function expandVerses(spec) {
  if (!spec) return [];
  const parts = Array.isArray(spec) ? spec : String(spec).split(/[,;]/);
  const verses = [];
  for (const partRaw of parts) {
    const part = String(partRaw).trim();
    if (!part) continue;
    if (/^\d+$/.test(part)) {
      verses.push(parseInt(part, 10));
    } else {
      const m = part.match(/^(\d+)-(\d+)$/);
      if (!m) return null;
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      if (end < start) return null;
      for (let v = start; v <= end; v++) verses.push(v);
    }
  }
  // remove duplicates and sort
  return [...new Set(verses.filter((v) => v > 0))].sort((a, b) => a - b);
}

// Parse a reference string like "John 3:16-18,20;4:1".
function parseRefString(input = '') {
  const str = String(input).trim();
  if (!str) return null;

  // Determine book
  let bookId = null;
  let rest = '';
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
  if (!bookId) return null;

  if (!rest) return { book: bookId, ranges: [] };

  const ranges = [];
  for (const segRaw of rest.split(/;/)) {
    const seg = segRaw.trim();
    if (!seg) continue;
    // Chapter range like "3-5"
    let m;
    if ((m = seg.match(/^(\d+)-(\d+)$/))) {
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      if (!start || !end || end < start) return null;
      for (let c = start; c <= end; c++) ranges.push({ chapter: c });
      continue;
    }
    // Chapter with verses "3:1-4,6"
    if ((m = seg.match(/^(\d+):(.*)$/))) {
      const chapter = parseInt(m[1], 10);
      if (!chapter) return null;
      const verses = expandVerses(m[2]);
      if (verses === null) return null;
      ranges.push(verses.length ? { chapter, verses } : { chapter });
      continue;
    }
    // Whole chapter number
    if (/^\d+$/.test(seg)) {
      ranges.push({ chapter: parseInt(seg, 10) });
      continue;
    }
    return null; // invalid segment
  }

  return { book: bookId, ranges };
}

// Convert input (string or object) to normalized reading object
function toReading(input) {
  if (!input) return null;
  if (typeof input === 'string') return parseRefString(input);

  if (typeof input !== 'object') return null;
  let { book } = input;
  if (typeof book === 'string') book = nameToId(book);
  if (typeof book !== 'number' || book < 1 || book > 66) return null;

  let ranges = [];
  if (Array.isArray(input.ranges)) {
    ranges = input.ranges;
  } else if (typeof input.chapter === 'number') {
    ranges = [{ chapter: input.chapter, verses: input.verses }];
  } else {
    return null;
  }

  const normRanges = [];
  for (const r of ranges) {
    if (!r || typeof r.chapter !== 'number' || r.chapter <= 0) return null;
    if (r.verses === undefined) {
      normRanges.push({ chapter: r.chapter });
    } else {
      const verses = expandVerses(r.verses);
      if (verses === null) return null;
      normRanges.push(verses.length ? { chapter: r.chapter, verses } : { chapter: r.chapter });
    }
  }

  return { book, ranges: normRanges };
}

module.exports = { expandVerses, parseRefString, toReading };

