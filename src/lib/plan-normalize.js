const { toReading } = require('./parseRef');
const { idToName } = require('./books');

// Allowed metadata fields for readings and day-level _meta.
const META_FIELDS = [
  'title',
  'note',
  'prayer',
  'discussion',
  'translation',
  'image',
  'link',
  'tags',
];

function pickMeta(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const meta = {};
  for (const key of META_FIELDS) {
    if (obj[key] !== undefined) meta[key] = obj[key];
  }
  return meta;
}

function normalizeReading(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    return toReading(input);
  }
  if (typeof input === 'object') {
    const { ref, book, ranges, chapter, verses, ...rest } = input;
    const spec = ref !== undefined ? ref : { book, ranges, chapter, verses };
    const reading = toReading(spec);
    if (!reading) return null;
    const meta = pickMeta(rest);
    return Object.keys(meta).length ? { ...reading, ...meta } : reading;
  }
  return null;
}

function normalizeDay(day) {
  if (day === undefined || day === null) return { readings: [] };
  if (typeof day === 'string') {
    return { readings: [normalizeReading(day)] };
  }
  if (Array.isArray(day)) {
    return { readings: day.map(normalizeReading) };
  }
  if (typeof day === 'object') {
    if ('readings' in day || '_meta' in day) {
      const { readings = [], _meta } = day;
      const norm = { readings: readings.map(normalizeReading) };
      if (_meta !== undefined) {
        const meta = pickMeta(_meta);
        if (Object.keys(meta).length) norm._meta = meta;
      }
      return norm;
    }
    return { readings: [normalizeReading(day)] };
  }
  return { readings: [] };
}

function normalizeDays(days) {
  if (!Array.isArray(days)) return [];
  return days.map(normalizeDay);
}

function formatReading(reading) {
  if (!reading) return '';
  const bookName = idToName(reading.book) || '';
  const segments = [];
  for (const r of reading.ranges || []) {
    if (r.verses && r.verses.length) {
      const verses = [];
      const vs = [...r.verses].sort((a, b) => a - b);
      let start = vs[0];
      let prev = vs[0];
      for (let i = 1; i <= vs.length; i++) {
        const v = vs[i];
        if (v === prev + 1) {
          prev = v;
          continue;
        }
        if (start === prev) verses.push(String(start));
        else verses.push(`${start}-${prev}`);
        start = v;
        prev = v;
      }
      segments.push(`${r.chapter}:${verses.join(',')}`);
    } else {
      segments.push(String(r.chapter));
    }
  }
  const ref = `${bookName} ${segments.join(';')}`.trim();
  let out = reading.title ? `${reading.title}: ${ref}` : ref;
  if (reading.translation) out += ` (${reading.translation})`;
  return out;
}

function renderMeta(meta, indent = '', opts = {}) {
  const lines = [];
  if (!meta) return lines;
  for (const key of META_FIELDS) {
    if (key === 'title') continue; // titles handled separately
    if (opts.skipTranslation && key === 'translation') continue;
    if (meta[key] !== undefined) {
      const value =
        key === 'tags' && Array.isArray(meta[key]) ? meta[key].join(', ') : meta[key];
      lines.push(`${indent}${key[0].toUpperCase() + key.slice(1)}: ${value}`);
    }
  }
  return lines;
}

function formatDay(day) {
  const readings = Array.isArray(day.readings) ? day.readings : [];
  const lines = [];
  for (const r of readings) {
    lines.push(`• ${formatReading(r)}`);
    lines.push(...renderMeta(r, '  ', { skipTranslation: true }));
  }
  if (day._meta) lines.push(...renderMeta(day._meta));
  return lines.join('\n');
}

module.exports = { normalizeDays, formatReading, formatDay };
