const { openReading } = require('../db/openReading');
const { idToName } = require('./books');

function compactRanges(verses = []) {
  if (!verses.length) return '';
  const sorted = [...verses].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const v = sorted[i];
    if (v === prev + 1) {
      prev = v;
      continue;
    }
    if (start === prev) parts.push(String(start));
    else parts.push(`${start}–${prev}`);
    start = v;
    prev = v;
  }
  return parts.join(',');
}

function buildLabel(reading) {
  if (!reading) return '';
  const bookName = idToName(reading.book) || '';
  const segments = [];
  for (const r of reading.ranges || []) {
    if (r.verses && r.verses.length) {
      segments.push(`${r.chapter}:${compactRanges(r.verses)}`);
    } else {
      segments.push(String(r.chapter));
    }
  }
  const ref = `${bookName} ${segments.join(';')}`.trim();
  return reading.title ? `${reading.title}: ${ref}` : ref;
}

const META_FIELDS = [
  'note',
  'prayer',
  'discussion',
  'translation',
  'image',
  'link',
  'tags',
];

function renderMeta(meta) {
  const lines = [];
  if (!meta) return lines;
  for (const key of META_FIELDS) {
    if (key === 'translation') continue; // translation shown via verses
    if (meta[key] !== undefined) {
      const value =
        key === 'tags' && Array.isArray(meta[key])
          ? meta[key].join(', ')
          : meta[key];
      lines.push(`${key[0].toUpperCase() + key.slice(1)}: ${value}`);
    }
  }
  return lines;
}

async function openAdapter(preferred) {
  try {
    return await openReading(preferred);
  } catch (err) {
    const fallback = preferred === 'kjv' ? 'asv' : 'kjv';
    return await openReading(fallback);
  }
}

async function formatDayWithText(day, preferredTranslation = 'asv') {
  const adapter = await openAdapter(preferredTranslation);
  const lines = [];
  const readings = Array.isArray(day.readings) ? day.readings : [];
  for (const r of readings) {
    lines.push(`• ${buildLabel(r)}`);
    for (const seg of r.ranges || []) {
      let rows;
      if (seg.verses && seg.verses.length) {
        rows = await adapter.getVersesSubset(r.book, seg.chapter, seg.verses);
      } else {
        rows = await adapter.getChapter(r.book, seg.chapter);
      }
      for (const row of rows) {
        lines.push(`  ${row.verse}. ${row.text}`);
      }
    }
  }
  if (day._meta) lines.push(...renderMeta(day._meta));
  return lines.join('\n');
}

module.exports = { formatDayWithText };

